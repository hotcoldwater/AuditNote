import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildExamCompositeKey, buildExamLocationKey, readExamTsvRows } from './lib/examTsv';

type DbExamQuestion = {
  id: string;
  part_no: number | null;
  chapter_no: number | null;
  section_no: number | null;
  problem_no: number | null;
  question_text: string;
};

async function fetchAllExamQuestions(supabase: any) {
  const rows: DbExamQuestion[] = [];
  let from = 0;

  while (true) {
    const to = from + 999;
    const { data, error } = await supabase
      .from('exam_questions')
      .select('id, part_no, chapter_no, section_no, problem_no, question_text')
      .range(from, to)
      .order('id');
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...(data as DbExamQuestion[]));
    if (data.length < 1000) {
      break;
    }
    from += 1000;
  }

  return rows;
}

async function countRefs(supabase: any, questionId: string) {
  const [{ count: attemptCount, error: attemptError }, issueResponse] = await Promise.all([
    supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('question_id', questionId),
    supabase.from('issue_reports').select('*', { count: 'exact', head: true }).eq('question_id', questionId),
  ]);

  if (attemptError) {
    throw attemptError;
  }
  return {
    attemptCount: attemptCount ?? 0,
    issueCount: issueResponse.error ? 0 : (issueResponse.count ?? 0),
  };
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  }

  const localRows = readExamTsvRows().map(({ source, row }) => ({
    source: path.basename(source),
    id: row.id,
    compositeKey: buildExamCompositeKey({
      partNo: row.partNo,
      chapterNo: row.chapterNo,
      sectionNo: row.sectionNo,
      problemNo: row.problemNo,
      questionText: row.questionText,
    }),
    locationKey: buildExamLocationKey({
      partNo: row.partNo,
      chapterNo: row.chapterNo,
      sectionNo: row.sectionNo,
      problemNo: row.problemNo,
    }),
  }));
  const canonicalByComposite = new Map(localRows.map((item) => [item.compositeKey, item.id]));
  const canonicalByLocation = new Map(localRows.map((item) => [item.locationKey, item.id]));
  const localIds = new Set(localRows.map((item) => item.id));

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dbRows = await fetchAllExamQuestions(supabase);
  const compositeCandidates = dbRows
    .filter((row) => !localIds.has(row.id))
    .map((row) => {
      const compositeKey = buildExamCompositeKey({
        partNo: row.part_no,
        chapterNo: row.chapter_no,
        sectionNo: row.section_no,
        problemNo: row.problem_no,
        questionText: row.question_text,
      });

      return {
        duplicateId: row.id,
        canonicalId: canonicalByComposite.get(compositeKey) ?? null,
      };
    })
    .filter((item): item is { duplicateId: string; canonicalId: string } => Boolean(item.canonicalId));

  const locationCandidates = dbRows
    .filter((row) => !localIds.has(row.id))
    .map((row) => {
      const locationKey = buildExamLocationKey({
        partNo: row.part_no,
        chapterNo: row.chapter_no,
        sectionNo: row.section_no,
        problemNo: row.problem_no,
      });

      return {
        duplicateId: row.id,
        canonicalId: canonicalByLocation.get(locationKey) ?? null,
      };
    })
    .filter((item): item is { duplicateId: string; canonicalId: string } => Boolean(item.canonicalId));

  const candidateMap = new Map<string, { duplicateId: string; canonicalId: string }>();
  for (const item of [...compositeCandidates, ...locationCandidates]) {
    if (!candidateMap.has(item.duplicateId)) {
      candidateMap.set(item.duplicateId, item);
    }
  }
  const duplicateCandidates = [...candidateMap.values()];

  const refSummaries = await Promise.all(
    duplicateCandidates.map(async (item) => ({
      ...item,
      ...(await countRefs(supabase, item.duplicateId)),
    })),
  );

  const unmatched = dbRows
    .filter((row) => !localIds.has(row.id))
    .filter((row) => !duplicateCandidates.some((item) => item.duplicateId === row.id))
    .map((row) => row.id);

  const report = {
    dryRun,
    duplicateCandidates: duplicateCandidates.length,
    compositeCandidates: compositeCandidates.length,
    locationCandidates: locationCandidates.length,
    unmatchedOnlyDb: unmatched.length,
    refSummaries,
    unmatched,
  };

  if (dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  for (const item of duplicateCandidates) {
    const { error: updateAttemptError } = await supabase
      .from('exam_attempts')
      .update({ question_id: item.canonicalId })
      .eq('question_id', item.duplicateId);
    if (updateAttemptError) {
      throw updateAttemptError;
    }

    const { error: updateIssueError } = await supabase
      .from('issue_reports')
      .update({ question_id: item.canonicalId })
      .eq('question_id', item.duplicateId);
    void updateIssueError;
  }

  const duplicateIds = duplicateCandidates.map((item) => item.duplicateId);
  for (let index = 0; index < duplicateIds.length; index += 100) {
    const chunk = duplicateIds.slice(index, index + 100);
    const { error } = await supabase.from('exam_questions').delete().in('id', chunk);
    if (error) {
      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        deleted: duplicateIds.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
  } else {
    try {
      console.error(JSON.stringify(error, null, 2));
    } catch {
      console.error(error);
    }
  }
  process.exit(1);
});
