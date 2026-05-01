import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildExamCompositeKey, normalizeExamText, readExamTsvRows } from './lib/examTsv';

type DbExamQuestion = {
  id: string;
  part_no: number | null;
  chapter_no: number | null;
  section_no: number | null;
  problem_no: number | null;
  exam_year_raw: string | null;
  source_page: string | null;
  question_text: string;
  answer_text: string;
  explanation_text: string | null;
  check_status: string | null;
  note: string | null;
  is_active: boolean | null;
};

type DbRefSummary = {
  questionId: string;
  attemptCount: number;
  issueReportCount: number;
};

async function fetchAllExamQuestions(supabase: any) {
  const rows: DbExamQuestion[] = [];
  let from = 0;

  while (true) {
    const to = from + 999;
    const { data, error } = await supabase
      .from('exam_questions')
      .select(
        'id, part_no, chapter_no, section_no, problem_no, exam_year_raw, source_page, question_text, answer_text, explanation_text, check_status, note, is_active',
      )
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

async function fetchQuestionRefs(supabase: any, questionIds: string[]) {
  const summaries: DbRefSummary[] = [];

  for (const questionId of questionIds) {
    const [{ count: attemptCount, error: attemptError }, issueResponse] = await Promise.all([
      supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('question_id', questionId),
      supabase.from('issue_reports').select('*', { count: 'exact', head: true }).eq('question_id', questionId),
    ]);

    if (attemptError) {
      throw attemptError;
    }

    const issueReportCount = issueResponse.error ? 0 : (issueResponse.count ?? 0);

    summaries.push({
      questionId,
      attemptCount: attemptCount ?? 0,
      issueReportCount,
    });
  }

  return summaries;
}

async function main() {
  const rows = readExamTsvRows();
  const localRows = rows.map(({ source, rowNumber, row }) => ({
    source: path.basename(source),
    rowNumber,
    id: row.id,
    partNo: row.partNo,
    chapterNo: row.chapterNo,
    sectionNo: row.sectionNo,
    problemNo: row.problemNo,
    questionText: row.questionText,
    answerText: row.answerText,
    explanationText: row.explanationText,
    checkStatus: row.checkStatus,
    note: row.note,
    compositeKey: buildExamCompositeKey({
      partNo: row.partNo,
      chapterNo: row.chapterNo,
      sectionNo: row.sectionNo,
      problemNo: row.problemNo,
      questionText: row.questionText,
    }),
  }));

  const localIdSet = new Set(localRows.map((item) => item.id));
  const localByComposite = new Map(localRows.map((item) => [item.compositeKey, item]));
  const localDuplicateComposite = [...new Map(localRows.map((item) => [item.compositeKey, 0])).keys()].filter(
    (key) => localRows.filter((row) => row.compositeKey === key).length > 1,
  );

  const report: Record<string, unknown> = {
    local: {
      files: [...new Set(rows.map((item) => path.basename(item.source)))].length,
      rows: localRows.length,
      duplicateIds: localRows.length - localIdSet.size,
      duplicateComposite: localDuplicateComposite.length,
      needsCheck: localRows.filter((item) => item.checkStatus === 'NEEDS_CHECK').length,
      missingExplanation: localRows.filter((item) => !String(item.explanationText ?? '').trim()).length,
    },
  };

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dbRows = await fetchAllExamQuestions(supabase);
  const dbByComposite = new Map<string, DbExamQuestion[]>();

  for (const row of dbRows) {
    const compositeKey = buildExamCompositeKey({
      partNo: row.part_no,
      chapterNo: row.chapter_no,
      sectionNo: row.section_no,
      problemNo: row.problem_no,
      questionText: row.question_text,
    });
    const items = dbByComposite.get(compositeKey) ?? [];
    items.push(row);
    dbByComposite.set(compositeKey, items);
  }

  const dbDuplicateGroups = [...dbByComposite.entries()].filter(([, items]) => items.length > 1);
  const onlyDb = dbRows.filter((row) => !localIdSet.has(row.id));
  const onlyLocal = localRows.filter((row) => !dbRows.some((item) => item.id === row.id));
  const unmatchedOnlyDb = onlyDb.filter((row) => {
    const compositeKey = buildExamCompositeKey({
      partNo: row.part_no,
      chapterNo: row.chapter_no,
      sectionNo: row.section_no,
      problemNo: row.problem_no,
      questionText: row.question_text,
    });
    return !localByComposite.has(compositeKey);
  });

  const duplicateQuestionIds = [...new Set(dbDuplicateGroups.flatMap(([, items]) => items.map((item) => item.id)))];
  const refSummaries = await fetchQuestionRefs(supabase, duplicateQuestionIds);
  const refSummaryMap = new Map(refSummaries.map((item) => [item.questionId, item]));

  report.db = {
    rows: dbRows.length,
    duplicateCompositeGroups: dbDuplicateGroups.length,
    duplicateRows: dbDuplicateGroups.reduce((sum, [, items]) => sum + items.length - 1, 0),
    onlyDb: onlyDb.length,
    onlyLocal: onlyLocal.length,
    unmatchedOnlyDb: unmatchedOnlyDb.length,
    missingExplanation: dbRows.filter((item) => !String(item.explanation_text ?? '').trim()).length,
    sampleDuplicateGroups: dbDuplicateGroups.slice(0, 20).map(([key, items]) => ({
      key,
      ids: items.map((item) => item.id),
      refs: items.map((item) => refSummaryMap.get(item.id) ?? { questionId: item.id, attemptCount: 0, issueReportCount: 0 }),
      preview: normalizeExamText(items[0]?.question_text).slice(0, 140),
    })),
    unmatchedOnlyDbRows: unmatchedOnlyDb.map((item) => ({
      id: item.id,
      partNo: item.part_no,
      chapterNo: item.chapter_no,
      sectionNo: item.section_no,
      problemNo: item.problem_no,
      checkStatus: item.check_status,
      note: item.note,
      preview: normalizeExamText(item.question_text).slice(0, 180),
    })),
  };

  console.log(JSON.stringify(report, null, 2));
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
