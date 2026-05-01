import 'dotenv/config';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { buildExamCompositeKey, collectExamFiles, parseTsv, type RawRow } from './lib/examTsv';

type ValidationIssue = { row: string; id: string; message: string };

const FIELD_MAP: Record<string, string> = {
  partNo: 'part_no',
  chapterNo: 'chapter_no',
  sectionNo: 'section_no',
  problemNo: 'problem_no',
  examYearRaw: 'exam_year_raw',
  examYear: 'exam_year_raw',
  examYears: 'exam_years',
  examRound: 'exam_round',
  examVariant: 'exam_variant',
  sourcePage: 'source_page',
  sourceRef: 'source_page',
  partTitle: 'part_title',
  chapterTitle: 'chapter_title',
  sectionTitle: 'section_title',
  questionText: 'question_text',
  question: 'question_text',
  answerText: 'answer_text',
  answer: 'answer_text',
  explanationText: 'explanation_text',
  checkStatus: 'check_status',
  contentType: 'content_type',
  requiredKeywords: 'required_keywords',
  optionalKeywords: 'optional_keywords',
  questionNo: 'problem_no',
};

const NUMBER_FIELDS = new Set(['partNo', 'chapterNo', 'sectionNo', 'problemNo']);
const ARRAY_FIELDS = new Set(['examYears', 'requiredKeywords', 'optionalKeywords']);
const REQUIRED_COLUMNS = ['id'];

function usage() {
  console.log('Usage: npm run import:exams');
  console.log('       npm run import:exams -- --dry-run');
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toArray(value: string) {
  return value
    .split(/[|,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateAndTransform(rows: Array<{ source: string; row: RawRow }>) {
  const seenIds = new Set<string>();
  const seenCompositeKeys = new Map<string, string>();
  const issues: ValidationIssue[] = [];
  const invalidIndexes = new Set<number>();
  const transformed: Record<string, unknown>[] = [];

  rows.forEach(({ source, row }, index) => {
    const location = `${path.basename(source)}:${index + 2}`;
    const id = row.id?.trim() ?? '';

    const requiredFields = {
      id: row.id,
      partNo: row.partNo,
      chapterNo: row.chapterNo,
      questionText: row.questionText ?? row.question,
      answerText: row.answerText ?? row.answer,
    };

    for (const [column, value] of Object.entries(requiredFields)) {
      if (!String(value ?? '').trim()) {
        issues.push({ row: location, id: id || '-', message: `${column} 누락` });
        invalidIndexes.add(index);
      }
    }

    if (id && seenIds.has(id)) {
      issues.push({ row: location, id, message: '중복 id' });
      invalidIndexes.add(index);
    }
    seenIds.add(id);

    const compositeKey = buildExamCompositeKey({
      partNo: row.partNo,
      chapterNo: row.chapterNo,
      sectionNo: row.sectionNo,
      problemNo: row.problemNo,
      questionText: row.questionText ?? row.question,
    });
    const previousComposite = seenCompositeKeys.get(compositeKey);
    if (previousComposite) {
      issues.push({ row: location, id: id || '-', message: `중복 문항 내용 (${previousComposite})` });
      invalidIndexes.add(index);
    } else {
      seenCompositeKeys.set(compositeKey, id || location);
    }

    const record: Record<string, unknown> = {};

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const key = FIELD_MAP[rawKey] ?? rawKey.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
      const value = rawValue ?? '';

      if (ARRAY_FIELDS.has(rawKey)) {
        record[key] = toArray(value);
        return;
      }

      if (NUMBER_FIELDS.has(rawKey)) {
        const parsed = toNullableNumber(value);
        if (value.trim() && Number.isNaN(parsed)) {
          issues.push({ row: location, id: id || '-', message: `${rawKey} 숫자 변환 실패` });
          invalidIndexes.add(index);
        }
        record[key] = Number.isNaN(parsed) ? null : parsed;
        return;
      }

      record[key] = value.trim() || null;
    });

    record.id = id;
    record.part_title = String(record.part_title ?? '').trim();
    record.chapter_title = String(record.chapter_title ?? '').trim();
    record.section_title = String(record.section_title ?? row.title ?? '').trim() || null;
    record.question_text = String(record.question_text ?? '').trim();
    record.answer_text = String(record.answer_text ?? '').trim();
    record.exam_year_raw = String(record.exam_year_raw ?? '').trim() || null;
    record.exam_years = Array.isArray(record.exam_years) ? record.exam_years : [];
    record.is_active = true;
    record.check_status = record.check_status ?? 'DRAFT';
    transformed.push(record);
  });

  return {
    validRows: transformed.filter((_row, index) => !invalidIndexes.has(index)),
    issues,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = collectExamFiles();
  if (files.length === 0) {
    usage();
    throw new Error('가져올 기출 TSV 파일을 찾지 못했습니다.');
  }

  const rows = files.flatMap((file) => {
    const parsed = parseTsv(fs.readFileSync(file, 'utf8'));
    const headers = parsed.headers;
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(`${path.basename(file)} 필수 컬럼 누락: ${missingColumns.join(', ')}`);
    }

    const hasQuestionColumn = headers.includes('questionText') || headers.includes('question');
    const hasAnswerColumn = headers.includes('answerText') || headers.includes('answer');
    const hasPartColumn = headers.includes('partNo');
    const hasChapterColumn = headers.includes('chapterNo');

    if (!hasQuestionColumn || !hasAnswerColumn || !hasPartColumn || !hasChapterColumn) {
      throw new Error(
        `${path.basename(file)} 기출 TSV 형식이 올바르지 않습니다. partNo/chapterNo/questionText(or question)/answerText(or answer)가 필요합니다.`,
      );
    }

    return parsed.rows.map((row) => ({ source: file, row }));
  });
  const validation = validateAndTransform(rows);

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('검증 결과:', {
    files: files.length,
    totalRows: rows.length,
    validRows: validation.validRows.length,
    issues: validation.issues.length,
    dryRun,
  });
  validation.issues.slice(0, 20).forEach((issue) => {
    console.log(`- ${issue.row} [${issue.id}] ${issue.message}`);
  });

  if (dryRun) {
    return;
  }

  if (validation.validRows.length === 0) {
    throw new Error('업서트할 유효한 기출 문항이 없습니다.');
  }

  const chunkSize = 200;
  for (let index = 0; index < validation.validRows.length; index += chunkSize) {
    const chunk = validation.validRows.slice(index, index + chunkSize);
    const { error } = await supabase.from('exam_questions').upsert(chunk, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  }

  console.log(`완료: ${validation.validRows.length}건 upsert`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
