import type { ResultStatus, ScoringResult } from '../types';

const SKIPPED_ANSWERS = new Set(['', '모르겠어요', '모름']);

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

export function normalizeScoringResult(result: Pick<ScoringResult, 'score' | 'reason' | 'shouldAddWrongNote'>): ScoringResult {
  const score = clampScore(result.score);
  const resultStatus = deriveResultStatus(score);

  return {
    score,
    resultStatus,
    reason: result.reason.trim() || '채점 사유가 제공되지 않았습니다.',
    shouldAddWrongNote: resultStatus === 'WRONG' || resultStatus === 'SKIPPED' ? true : result.shouldAddWrongNote,
  };
}

export function isSkippedAnswer(userAnswer: string) {
  return SKIPPED_ANSWERS.has(userAnswer.trim());
}
