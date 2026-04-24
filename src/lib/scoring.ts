import type { ResultStatus, ScoringResult } from '../types';

function normalizeCompact(value: string) {
  return value.toLowerCase().replace(/[^0-9a-zA-Z가-힣]/g, '');
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function parseKeywordInput(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(/[|,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeSimilarity(correctAnswer: string, userAnswer: string) {
  const correctTokens = new Set(tokenize(correctAnswer));
  const userTokens = new Set(tokenize(userAnswer));

  if (correctTokens.size === 0 || userTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  correctTokens.forEach((token) => {
    if (userTokens.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([...correctTokens, ...userTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function mapResultStatus(score: number): ResultStatus {
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

export function scoreAnswer(
  userAnswer: string,
  correctAnswer: string,
  requiredKeywordsInput: string[] | string | null | undefined,
  optionalKeywordsInput: string[] | string | null | undefined,
): ScoringResult {
  const trimmedAnswer = userAnswer.trim();
  const requiredKeywords = parseKeywordInput(requiredKeywordsInput);
  const optionalKeywords = parseKeywordInput(optionalKeywordsInput);

  if (!trimmedAnswer) {
    return {
      score: 0,
      resultStatus: 'SKIPPED',
      includedRequiredKeywords: [],
      missingRequiredKeywords: requiredKeywords,
      includedOptionalKeywords: [],
      answerLengthRatio: 0,
      similarityScore: 0,
      feedbackMessage: '답안을 입력하지 않아 0점 처리되었습니다.',
    };
  }

  const normalizedAnswer = normalizeCompact(trimmedAnswer);
  const includedRequiredKeywords = requiredKeywords.filter((keyword) =>
    normalizedAnswer.includes(normalizeCompact(keyword)),
  );
  const missingRequiredKeywords = requiredKeywords.filter(
    (keyword) => !includedRequiredKeywords.includes(keyword),
  );
  const includedOptionalKeywords = optionalKeywords.filter((keyword) =>
    normalizedAnswer.includes(normalizeCompact(keyword)),
  );

  const requiredScore =
    requiredKeywords.length > 0 ? (50 * includedRequiredKeywords.length) / requiredKeywords.length : 50;
  const optionalScore =
    optionalKeywords.length > 0 ? (20 * includedOptionalKeywords.length) / optionalKeywords.length : 20;

  const answerLengthRatio =
    correctAnswer.trim().length > 0 ? trimmedAnswer.length / correctAnswer.trim().length : 0;

  let completenessScore = 0;
  if (answerLengthRatio >= 0.8) {
    completenessScore = 15;
  } else if (answerLengthRatio >= 0.6) {
    completenessScore = 12;
  } else if (answerLengthRatio >= 0.4) {
    completenessScore = 8;
  } else if (answerLengthRatio >= 0.2) {
    completenessScore = 4;
  }

  const similarityRatio = computeSimilarity(correctAnswer, trimmedAnswer);
  const similarityScore = similarityRatio * 15;

  let totalScore = requiredScore + optionalScore + completenessScore + similarityScore;

  const requiredCoverage =
    requiredKeywords.length > 0 ? includedRequiredKeywords.length / requiredKeywords.length : 1;

  if (requiredCoverage < 0.5) {
    totalScore = Math.min(totalScore, 59);
  }

  if (answerLengthRatio < 0.2) {
    totalScore = Math.min(totalScore, 50);
  }

  if (requiredCoverage === 1 && answerLengthRatio >= 0.4) {
    totalScore = Math.max(totalScore, 75);
  }

  const score = Math.max(0, Math.min(100, Math.round(totalScore)));
  const resultStatus = mapResultStatus(score);

  let feedbackMessage = '답안 구조는 유지됐지만 일부 핵심 표현을 더 보강해야 합니다.';
  if (resultStatus === 'EXCELLENT') {
    feedbackMessage = '핵심 키워드와 문장 충실도가 모두 높습니다.';
  } else if (resultStatus === 'CORRECT') {
    feedbackMessage = '정답 기준에 가깝습니다. 빠진 표현만 보완하면 됩니다.';
  } else if (resultStatus === 'REVIEW') {
    feedbackMessage = '핵심 개념은 일부 맞았지만 복습이 필요합니다.';
  } else if (resultStatus === 'WRONG') {
    feedbackMessage = '필수 키워드 누락이 많아 오답노트 복습이 필요합니다.';
  }

  return {
    score,
    resultStatus,
    includedRequiredKeywords,
    missingRequiredKeywords,
    includedOptionalKeywords,
    answerLengthRatio,
    similarityScore: Number(similarityScore.toFixed(2)),
    feedbackMessage,
  };
}
