import type { ExamQuestion, ExamReviewStatus, ExamYearOption } from '../types';
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

function parseTsvRows(content: string) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === '\t' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

function parseTsv(content: string) {
  const rows = parseTsvRows(content);
  if (rows.length === 0) {
    return [] as RawRow[];
  }

  const headers = rows[0].map((item) => item.trim());
  return rows.slice(1).map((cells) =>
    headers.reduce<RawRow>((acc, header, index) => {
      acc[header] = cells[index]?.trim() ?? '';
      return acc;
    }, {}),
  );
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
    review_status:
      String(row.review_status ?? row.reviewStatus ?? '')
        .trim()
        .toUpperCase() === 'VERIFIED'
        ? 'VERIFIED'
        : String(row.review_status ?? row.reviewStatus ?? '')
              .trim()
              .toUpperCase() === 'NEEDS_REVIEW'
          ? 'NEEDS_REVIEW'
          : null,
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    reviewed_by: typeof row.reviewed_by === 'string' ? row.reviewed_by : null,
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

export async function fetchExamQuestionsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);

  if (uniqueIds.length === 0) {
    return { questions: [], source: 'local' as const };
  }

  const payload = await fetchExamQuestions();
  return {
    ...payload,
    questions: payload.questions.filter((item) => uniqueIds.includes(item.id)),
  };
}

export async function updateExamQuestionReview(
  questionId: string,
  reviewStatus: ExamReviewStatus,
  reviewerId: string,
) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 검토결과를 저장할 수 없습니다.');
  }

  const { data, error } = await withTimeout(
    supabase
      .from('exam_questions')
      .update({
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', questionId)
      .select('*')
      .single(),
    SUPABASE_TIMEOUT_MS,
  );

  if (error || !data) {
    throw new Error(error?.message ?? '검토결과를 저장하지 못했습니다.');
  }

  return normalizeExamQuestion(data);
}

export function getExamReviewLabel(reviewStatus: ExamReviewStatus | null | undefined) {
  if (reviewStatus === 'VERIFIED') {
    return '검수완료';
  }

  if (reviewStatus === 'NEEDS_REVIEW') {
    return '확인필요';
  }

  return null;
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

export function getAvailableExamYears(questions: ExamQuestion[]) {
  const yearMap = new Map<string, number>();

  for (const question of questions) {
    for (const year of question.exam_years) {
      const normalizedYear = String(year).trim();
      if (!normalizedYear) {
        continue;
      }
      yearMap.set(normalizedYear, (yearMap.get(normalizedYear) ?? 0) + 1);
    }
  }

  return [...yearMap.entries()]
    .map(([year, questionCount]) => ({ year, questionCount }) satisfies ExamYearOption)
    .sort((a, b) => Number(b.year) - Number(a.year));
}

export function getExamQuestionsByYear(questions: ExamQuestion[], year: string) {
  const normalizedYear = String(year).trim();
  if (!normalizedYear) {
    return [];
  }
  return sortQuestions(questions.filter((question) => question.exam_years.includes(normalizedYear)));
}

export function formatExamText(value: string) {
  return formatDetailedTextForDisplay(
    String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim(),
  );
}
