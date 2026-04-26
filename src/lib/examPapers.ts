import type { AnswerImage, ExamGradingPayload, ExamPaperAnswerDraft, ExamPaperQuestionResult, ExamQuestion, ScoringResult } from '../types';
import { deriveResultStatus } from './scoring';
import { isSupabaseConfigured, supabase } from './supabase';

const EXAM_PAPER_DRAFTS_KEY = 'auditnote.exam_paper_drafts.v1';

interface StoredDraftPayload {
  [userId: string]: {
    [year: string]: Record<string, ExamPaperAnswerDraft>;
  };
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getWeight(question: ExamQuestion) {
  const questionLength = question.question_text.trim().length;
  const answerLength = question.answer_text.trim().length;
  return Math.max(1, answerLength + questionLength * 0.35);
}

function loadDraftStore() {
  try {
    const payload = window.localStorage.getItem(EXAM_PAPER_DRAFTS_KEY);
    return payload ? (JSON.parse(payload) as StoredDraftPayload) : {};
  } catch {
    return {};
  }
}

function saveDraftStore(store: StoredDraftPayload) {
  try {
    window.localStorage.setItem(EXAM_PAPER_DRAFTS_KEY, JSON.stringify(store));
  } catch {
    return;
  }
}

export function loadExamPaperDrafts(userId: string, year: string) {
  const store = loadDraftStore();
  return store[userId]?.[year] ?? {};
}

export function saveExamPaperDraft(
  userId: string,
  year: string,
  draft: ExamPaperAnswerDraft,
) {
  const store = loadDraftStore();
  const byUser = store[userId] ?? {};
  const byYear = byUser[year] ?? {};
  byYear[draft.questionId] = draft;
  byUser[year] = byYear;
  store[userId] = byUser;
  saveDraftStore(store);
}

export function clearExamPaperDrafts(userId: string, year: string) {
  const store = loadDraftStore();
  if (!store[userId]?.[year]) {
    return;
  }
  delete store[userId][year];
  saveDraftStore(store);
}

export function summarizeDraftAnswer(userAnswer: string, answerImages: AnswerImage[]) {
  const trimmed = userAnswer.trim();
  if (trimmed) {
    return trimmed;
  }
  if (answerImages.length > 0) {
    return `사진 답안 ${answerImages.length}장 제출`;
  }
  return '';
}

export function buildExamPaperOverview(
  year: string,
  questions: ExamQuestion[],
  questionResults: ExamPaperQuestionResult[],
) {
  const byQuestion = new Map(questionResults.map((item) => [item.questionId, item]));
  let weightedSum = 0;
  let weightTotal = 0;
  let submittedCount = 0;

  for (const question of questions) {
    const questionResult = byQuestion.get(question.id);
    if (!questionResult) {
      continue;
    }
    const weight = getWeight(question);
    weightedSum += questionResult.scoring.score * weight;
    weightTotal += weight;
    submittedCount += 1;
  }

  const score = weightTotal > 0 ? clampScore(weightedSum / weightTotal) : 0;
  const resultStatus = deriveResultStatus(score);
  const missingCounts = new Map<string, number>();
  const wrongCounts = new Map<string, number>();

  for (const result of questionResults) {
    for (const point of result.details.missingPoints) {
      missingCounts.set(point, (missingCounts.get(point) ?? 0) + 1);
    }
    for (const point of result.details.wrongPoints) {
      wrongCounts.set(point, (wrongCounts.get(point) ?? 0) + 1);
    }
  }

  const topMissing = [...missingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value]) => value);
  const topWrong = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([value]) => value);

  const summary =
    score >= 85
      ? `출제 ${year} 답안은 전체 방향이 안정적이며, 일부 논점만 보완하면 됩니다.`
      : score >= 60
        ? `출제 ${year} 답안은 기본 방향은 맞지만, 누락 논점 보완이 필요합니다.`
        : `출제 ${year} 답안은 핵심 결론과 필수 논점 정리가 더 필요합니다.`;

  const adviceParts = [
    topMissing.length > 0 ? `${topMissing.join(', ')} 중심으로 다시 정리하세요.` : '',
    topWrong.length > 0 ? `${topWrong.join(', ')}처럼 보일 표현은 더 명확히 다듬으세요.` : '',
  ].filter(Boolean);

  return {
    score,
    resultStatus,
    submittedCount,
    totalCount: questions.length,
    summary,
    advice: adviceParts.join(' '),
    topMissing,
    topWrong,
  };
}

interface ExamSummaryApiResponse {
  summary?: string;
  advice?: string;
}

export async function summarizeExamPaperWithAi(payload: {
  year: string;
  score: number;
  questionResults: Array<Pick<ExamPaperQuestionResult, 'index' | 'details' | 'scoring'>>;
}) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('grade-exam-summary', {
        body: payload,
      });
      if (!error && data) {
        return data as ExamSummaryApiResponse;
      }
    } catch {
      return null;
    }
  }

  try {
    const response = await fetch('/api/grade-exam-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ExamSummaryApiResponse;
  } catch {
    return null;
  }
}
