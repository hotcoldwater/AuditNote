import type { ResultStatus, ScoringResult } from '../types';

const SKIPPED_ANSWERS = new Set([
  '',
  'skip',
  '스킵',
  '패스',
  'pass',
  '모르겠어요',
  '모르겠습니다',
  '모르겠음',
  '모름',
  '몰라',
  '몰라요',
  '?',
  'ㅠㅠ',
  'ㅜㅜ',
]);

function normalizeSkipCandidate(userAnswer: string) {
  return String(userAnswer ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.!?,~`"'“”‘’()[\]{}]/g, '')
    .replace(/\s+/g, '');
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveResultStatus(score: number): ResultStatus {
  if (score >= 90) {
    return 'EXCELLENT';
  }
  if (score >= 75) {
    return 'CORRECT';
  }
  if (score >= 60) {
    return 'REVIEW';
  }
  if (score >= 1) {
    return 'WRONG';
  }
  return 'SKIPPED';
}

export function normalizeScoringResult(
  result: Pick<ScoringResult, 'score' | 'reason' | 'shouldAddWrongNote'> &
    Partial<Pick<ScoringResult, 'goodPart' | 'badPart' | 'missingPoints' | 'wrongConcepts'>>,
): ScoringResult {
  const score = clampScore(result.score);
  const resultStatus = deriveResultStatus(score);
  const shouldRecommendReview = resultStatus === 'REVIEW';

  return {
    score,
    resultStatus,
    reason: result.reason.trim() || '채점 사유가 제공되지 않았습니다.',
    goodPart: result.goodPart?.trim() || '핵심적으로 맞게 쓴 부분은 아직 충분히 확인되지 않습니다.',
    badPart: result.badPart?.trim() || '보완이 필요한 핵심 문장을 더 구체적으로 적어 주세요.',
    missingPoints: Array.isArray(result.missingPoints) ? result.missingPoints.filter(Boolean) : [],
    wrongConcepts: Array.isArray(result.wrongConcepts) ? result.wrongConcepts.filter(Boolean) : [],
    shouldRecommendReview,
    shouldAddWrongNote: resultStatus === 'WRONG' || resultStatus === 'SKIPPED' ? true : result.shouldAddWrongNote,
  };
}

export function isSkippedAnswer(userAnswer: string) {
  const normalized = normalizeSkipCandidate(userAnswer);
  if (SKIPPED_ANSWERS.has(normalized)) {
    return true;
  }

  return /^(?:ㅠ|ㅜ){2,}$/.test(normalized);
}
