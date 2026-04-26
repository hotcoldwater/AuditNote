import type { ExamQuestion } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { formatDetailedTextForDisplay } from './standardDisplay';

const SUPABASE_TIMEOUT_MS = 12000;

export interface ExamQuestionsPayload {
  questions: ExamQuestion[];
  source: 'supabase' | 'local';
  notice?: string;
}

type RawRow = Record<string, string>;

const examQuestionFiles = import.meta.glob('../../data/DoeActualExam_*.tsv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), timeoutMs);
    }),
  ]);
}

function toNullableNumber(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toArray(value: string | null | undefined) {
  return String(value ?? '')
    .split(/[|,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTsv(content: string) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return [] as RawRow[];
  }

  const headers = lines[0].split('\t').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return headers.reduce<RawRow>((acc, header, index) => {
      acc[header] = cells[index]?.trim() ?? '';
      return acc;
    }, {});
  });
}

function normalizeExamQuestion(row: any): ExamQuestion {
  const partNo = Number(row.part_no ?? row.partNo ?? 0);
  const chapterNo = Number(row.chapter_no ?? row.chapterNo ?? 0);
  const sectionNo = toNullableNumber(String(row.section_no ?? row.sectionNo ?? ''));
  const fallbackTitle = String(row.title ?? '').trim();

  return {
    id: String(row.id ?? ''),
    part_no: partNo,
    chapter_no: chapterNo,
    section_no: sectionNo,
    problem_no: toNullableNumber(String(row.problem_no ?? row.problemNo ?? '')),
    exam_year_raw: String(row.exam_year_raw ?? row.examYearRaw ?? row.examYear ?? '').trim() || null,
    exam_years: Array.isArray(row.exam_years)
      ? row.exam_years.map((item: unknown) => String(item).trim()).filter(Boolean)
      : toArray(String(row.exam_years ?? row.examYears ?? row.examYear ?? '')),
    source_page: String(row.source_page ?? row.sourcePage ?? row.sourceRef ?? '').trim() || null,
    part_title: String(row.part_title ?? row.partTitle ?? '').trim(),
    chapter_title: String(row.chapter_title ?? row.chapterTitle ?? '').trim(),
    section_title: String(row.section_title ?? row.sectionTitle ?? fallbackTitle).trim() || null,
    question_text: String(row.question_text ?? row.questionText ?? row.question ?? '').trim(),
    answer_text: String(row.answer_text ?? row.answerText ?? row.answer ?? '').trim(),
    explanation_text: String(row.explanation_text ?? row.explanationText ?? '').trim() || null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
    check_status: String(row.check_status ?? row.checkStatus ?? 'DRAFT').trim() || 'DRAFT',
    note: String(row.note ?? '').trim() || null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

const localExamQuestions = Object.values(examQuestionFiles)
  .flatMap((raw) => parseTsv(raw))
  .map((row) => normalizeExamQuestion(row))
  .filter((row) => row.id && row.question_text && row.answer_text && row.is_active);

function sortQuestions(questions: ExamQuestion[]) {
  return [...questions].sort((a, b) => {
    const tupleDiffs = [
      a.part_no - b.part_no,
      a.chapter_no - b.chapter_no,
      (a.section_no ?? Number.MAX_SAFE_INTEGER) - (b.section_no ?? Number.MAX_SAFE_INTEGER),
      (a.problem_no ?? Number.MAX_SAFE_INTEGER) - (b.problem_no ?? Number.MAX_SAFE_INTEGER),
    ];

    const diff = tupleDiffs.find((value) => value !== 0);
    if (typeof diff === 'number' && diff !== 0) {
      return diff;
    }

    return a.id.localeCompare(b.id, 'ko');
  });
}

function fallbackQuestions(partNo?: number | null, chapterNo?: number | null): ExamQuestionsPayload {
  const filtered = localExamQuestions.filter(
    (item) =>
      (typeof partNo !== 'number' || item.part_no === partNo) &&
      (typeof chapterNo !== 'number' || item.chapter_no === chapterNo),
  );

  return {
    questions: sortQuestions(filtered),
    source: 'local',
    notice: 'Supabase 기출 데이터가 없어 내장 1편 데이터로 표시합니다.',
  };
}

export async function fetchExamQuestions(partNo?: number | null, chapterNo?: number | null): Promise<ExamQuestionsPayload> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackQuestions(partNo, chapterNo);
  }

  try {
    let query = supabase.from('exam_questions').select('*').eq('is_active', true);
    if (typeof partNo === 'number') {
      query = query.eq('part_no', partNo);
    }
    if (typeof chapterNo === 'number') {
      query = query.eq('chapter_no', chapterNo);
    }

    const { data, error } = await withTimeout(
      query.order('part_no').order('chapter_no').order('section_no').order('problem_no'),
      SUPABASE_TIMEOUT_MS,
    );

    if (error || !data || data.length === 0) {
      return fallbackQuestions(partNo, chapterNo);
    }

    return {
      questions: sortQuestions(data.map((item: ExamQuestion) => normalizeExamQuestion(item))),
      source: 'supabase',
    };
  } catch {
    return {
      ...fallbackQuestions(partNo, chapterNo),
      notice: 'Supabase 기출 응답이 지연되어 내장 1편 데이터로 표시합니다.',
    };
  }
}

export function groupQuestionsByChapter(questions: ExamQuestion[]) {
  const groups = new Map<number, ExamQuestion[]>();

  for (const question of sortQuestions(questions)) {
    const existing = groups.get(question.chapter_no) ?? [];
    existing.push(question);
    groups.set(question.chapter_no, existing);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapterNo, items]) => ({
      chapterNo,
      chapterTitle: items[0]?.chapter_title ?? `${chapterNo}장`,
      sectionCount: new Set(items.map((item) => item.section_no)).size,
      questionCount: items.length,
      questions: items,
    }));
}

export function getAvailableExamParts(questions: ExamQuestion[]) {
  return [...new Set(questions.map((item) => item.part_no).filter((item) => Number.isInteger(item)))].sort((a, b) => a - b);
}

export function formatExamText(value: string) {
  return formatDetailedTextForDisplay(
    String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim(),
  );
}
