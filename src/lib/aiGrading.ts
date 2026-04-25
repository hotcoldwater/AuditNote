import type { GradingMetadata, RuleScoringResult, ScoringResult } from '../types';
import { deriveResultStatus, isSkippedAnswer, normalizeScoringResult } from './scoring';
import { isSupabaseConfigured, supabase } from './supabase';

const GRADING_VERSION = '2026-04-25-v1';
const AI_WEIGHT = 0.7;
const RULE_WEIGHT = 0.3;
const LARGE_SCORE_GAP = 25;
const AI_WEIGHT_WHEN_GAP = 0.8;
const RULE_WEIGHT_WHEN_GAP = 0.2;
const KEYWORD_LIST_SCORE_CAP = 74;
const CRITICAL_WRONG_CONCEPT_SCORE_CAP = 59;
const GENERAL_WRONG_CONCEPTS = ['절대적 확신', '완전한 보증', '모든 오류를 발견', '모든 부정을 발견', '100% 보장'];

interface GradeAnswerInput {
  title: string;
  correctAnswer: string;
  userAnswer: string;
  requiredKeywords?: string[] | string | null;
  optionalKeywords?: string[] | string | null;
  wrongConcepts?: string[] | string | null;
}

interface GradeApiResponse {
  result?: Partial<ScoringResult>;
  metadata?: Partial<GradingMetadata>;
  error?: string;
}

const GRADE_API_PATH = '/api/grade';

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item ?? '').split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeText(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBulletPrefix(value: string) {
  return value.replace(/^\s*(?:\d+\)|\d+\.\s*|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮㉠㉡㉢㉣㉤㉥㉦㉧]|[-*])\s*/u, '').trim();
}

function normalizeIntroSentence(value: string) {
  return value
    .toLowerCase()
    .replace(/[.!?,:;()[\]{}"'“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNonSubstantiveSentence(value: string) {
  const normalized = normalizeIntroSentence(value);
  if (!normalized) {
    return true;
  }

  return [
    /^다음과 같은 내용(?:이다|입니다)?$/,
    /^다음과 같다$/,
    /^다음과 같습니다$/,
    /^다음과 같은 사항이 있다$/,
    /^다음 사항이 있다$/,
    /^다음의 내용(?:이다|입니다)?$/,
    /^다음의 사항이 있다$/,
    /^아래와 같다$/,
    /^내용은 다음과 같습니다$/,
    /^그 내용은 다음과 같다$/,
    /^다음 사항을 고려한다$/,
    /^크게 다음과 같다$/,
    /^크게 세 가지가 있다$/,
    /^다음과 같은 항목이 있다$/,
  ].some((pattern) => pattern.test(normalized));
}

function splitIntoUnits(value: string) {
  return String(value ?? '')
    .replace(/\\n/g, '\n')
    .split(/\r?\n+/)
    .map((line) => stripBulletPrefix(line))
    .filter((line) => line && !isNonSubstantiveSentence(line));
}

function splitIntoSentences(value: string) {
  const units = splitIntoUnits(value);
  if (units.length > 1) {
    return units;
  }

  return String(value ?? '')
    .replace(/\\n/g, ' ')
    .split(/(?<=[.!?다요])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !isNonSubstantiveSentence(sentence));
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      String(value ?? '')
        .toLowerCase()
        .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
}

function sentenceSimilarity(expected: string, actual: string) {
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);

  if (expectedTokens.length === 0 || actualTokens.length === 0) {
    return 0;
  }

  const actualSet = new Set(actualTokens);
  const overlap = expectedTokens.filter((token) => actualSet.has(token)).length;
  const coverage = overlap / expectedTokens.length;
  const density = overlap / Math.max(actualTokens.length, 1);
  const contains = actual.includes(expected) || expected.includes(actual) ? 0.15 : 0;

  return Math.max(0, Math.min(1, coverage * 0.8 + density * 0.2 + contains));
}

function includesKeyword(text: string, keyword: string) {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) {
    return false;
  }
  return normalizedText.includes(normalizedKeyword);
}

function computeSentenceScore(correctAnswer: string, userAnswer: string) {
  const expectedSentences = splitIntoSentences(correctAnswer);
  const userSentences = splitIntoSentences(userAnswer);

  if (expectedSentences.length === 0 || userSentences.length === 0) {
    return 0;
  }

  const unitScore = 100 / expectedSentences.length;
  const matches = expectedSentences.map((expected) =>
    userSentences.reduce((best, candidate) => Math.max(best, sentenceSimilarity(expected, candidate)), 0),
  );

  const baseScore = matches.reduce((total, similarity) => total + unitScore * similarity, 0);
  const perfectish = matches.every((similarity) => similarity >= 0.72);
  const solid = matches.every((similarity) => similarity >= 0.58);
  const bonus = perfectish ? 12 : solid ? 6 : 0;

  return Math.max(0, Math.min(100, Math.round(baseScore + bonus)));
}

function isKeywordListOnly(answer: string, correctAnswer: string) {
  const normalized = String(answer ?? '').trim();
  if (!normalized) {
    return false;
  }

  if (correctAnswer.trim().length <= 24) {
    return false;
  }

  const splitByListMarks = normalized
    .split(/[,\n/]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const hasListShape = splitByListMarks.length >= 3;
  const averageChunkLength =
    splitByListMarks.length > 0 ? splitByListMarks.reduce((sum, item) => sum + item.length, 0) / splitByListMarks.length : 0;
  const predicateCount = (normalized.match(/다\b|이다\b|한다\b|된다\b|있다\b|없다\b|해야\b|한다\b|임\b|음\b/g) ?? []).length;
  const particleCount = (normalized.match(/[이가은는을를의에와과도]/g) ?? []).length;

  return hasListShape && averageChunkLength <= 12 && predicateCount <= 1 && particleCount <= Math.max(2, splitByListMarks.length / 2);
}

function detectCriticalWrongConcepts(userAnswer: string, wrongConcepts?: string[] | string | null) {
  const candidates = [...normalizeList(wrongConcepts), ...GENERAL_WRONG_CONCEPTS];
  const normalizedAnswer = normalizeText(userAnswer);

  return Array.from(
    new Set(
      candidates.filter((concept) => {
        const normalizedConcept = normalizeText(concept);
        if (!normalizedConcept || !normalizedAnswer.includes(normalizedConcept)) {
          return false;
        }

        const negativePhrases = [`${normalizedConcept}이 아니다`, `${normalizedConcept}는 아니다`, `${normalizedConcept}가 아니다`, `${normalizedConcept}을 제공하지 않는다`, `${normalizedConcept}는 제공하지 않는다`];
        return !negativePhrases.some((phrase) => normalizedAnswer.includes(phrase));
      }),
    ),
  );
}

function computeRuleScore(input: GradeAnswerInput): RuleScoringResult {
  const requiredKeywords = normalizeList(input.requiredKeywords);
  const optionalKeywords = normalizeList(input.optionalKeywords);
  const sentenceScore = computeSentenceScore(input.correctAnswer, input.userAnswer);
  const requiredIncluded = requiredKeywords.filter((keyword) => includesKeyword(input.userAnswer, keyword));
  const optionalIncluded = optionalKeywords.filter((keyword) => includesKeyword(input.userAnswer, keyword));
  const missingPoints = requiredKeywords.filter((keyword) => !requiredIncluded.includes(keyword));
  const requiredCoverage = requiredKeywords.length ? requiredIncluded.length / requiredKeywords.length : 1;
  const optionalCoverage = optionalKeywords.length ? optionalIncluded.length / optionalKeywords.length : 0;
  const answerLengthRatio = Math.min(
    1.25,
    (input.userAnswer.trim().length || 0) / Math.max(input.correctAnswer.trim().length, 1),
  );
  const keywordBoost = requiredKeywords.length ? requiredCoverage * 16 + optionalCoverage * 6 : optionalCoverage * 4;
  const lengthAdjustment = answerLengthRatio < 0.18 ? -18 : answerLengthRatio < 0.3 ? -10 : answerLengthRatio > 1.1 ? 3 : 0;
  const isListOnly = isKeywordListOnly(input.userAnswer, input.correctAnswer);
  const wrongConceptHits = detectCriticalWrongConcepts(input.userAnswer, input.wrongConcepts);
  const hasCriticalWrongConcepts = wrongConceptHits.length > 0;

  let score = clampScore(sentenceScore + keywordBoost + lengthAdjustment);
  if (isListOnly) {
    score = Math.min(score, KEYWORD_LIST_SCORE_CAP);
  }
  if (hasCriticalWrongConcepts) {
    score = Math.min(score, CRITICAL_WRONG_CONCEPT_SCORE_CAP);
  }

  return {
    score,
    missingPoints,
    includedRequiredKeywords: requiredIncluded,
    includedOptionalKeywords: optionalIncluded,
    answerLengthRatio,
    similarityScore: sentenceScore,
    isKeywordListOnly: isListOnly,
    hasCriticalWrongConcepts,
    detectedWrongConcepts: wrongConceptHits,
  };
}

function blendScore(aiScore: number, ruleScore: number) {
  const gap = Math.abs(aiScore - ruleScore);
  if (gap >= LARGE_SCORE_GAP) {
    return clampScore(aiScore * AI_WEIGHT_WHEN_GAP + ruleScore * RULE_WEIGHT_WHEN_GAP);
  }
  return clampScore(aiScore * AI_WEIGHT + ruleScore * RULE_WEIGHT);
}

function buildFeedbackFromRule(ruleScore: RuleScoringResult) {
  const goodSegment =
    ruleScore.includedRequiredKeywords.length > 0
      ? `잘한 부분은 ${ruleScore.includedRequiredKeywords.slice(0, 2).join(', ')}를 반영한 점입니다`
      : '잘한 부분은 정답 취지와 맞는 표현을 일부 반영한 점입니다';
  const badSegment =
    ruleScore.missingPoints.length > 0
      ? `보완할 부분은 ${ruleScore.missingPoints.slice(0, 2).join(', ')} 보완이 필요한 점입니다`
      : '보완할 부분은 세부 요건과 문장 연결을 더 분명히 적는 점입니다';

  return {
    reason: `${goodSegment}. ${badSegment}.`,
  };
}

function finalizeResult(base: Partial<ScoringResult>, ruleScore: RuleScoringResult, score: number) {
  let finalScore = clampScore(score);

  if (ruleScore.isKeywordListOnly && base.resultStatus !== 'SKIPPED') {
    finalScore = Math.min(finalScore, KEYWORD_LIST_SCORE_CAP);
  }

  if (ruleScore.hasCriticalWrongConcepts) {
    finalScore = Math.min(finalScore, CRITICAL_WRONG_CONCEPT_SCORE_CAP);
  }

  const normalized = normalizeScoringResult({
    score: finalScore,
    reason: base.reason ?? '채점 사유가 제공되지 않았습니다.',
    shouldAddWrongNote: base.shouldAddWrongNote ?? finalScore < 60,
  });

  if (ruleScore.hasCriticalWrongConcepts && normalized.resultStatus !== 'SKIPPED') {
    normalized.resultStatus = 'WRONG';
    normalized.shouldAddWrongNote = true;
  }

  if (normalized.score >= 90 && (ruleScore.isKeywordListOnly || ruleScore.hasCriticalWrongConcepts)) {
    normalized.score = Math.min(normalized.score, ruleScore.hasCriticalWrongConcepts ? CRITICAL_WRONG_CONCEPT_SCORE_CAP : KEYWORD_LIST_SCORE_CAP);
    normalized.resultStatus = deriveResultStatus(normalized.score);
  }

  normalized.shouldRecommendReview = normalized.resultStatus === 'REVIEW';
  normalized.shouldAddWrongNote = normalized.resultStatus === 'WRONG' || normalized.resultStatus === 'SKIPPED';

  return normalized;
}

function buildLocalFallbackResult(input: GradeAnswerInput, fallbackReason = 'unsupported_region_or_api_unavailable') {
  const ruleScore = computeRuleScore(input);
  const feedback = buildFeedbackFromRule(ruleScore);
  const result = finalizeResult(
    {
      ...feedback,
      shouldAddWrongNote: ruleScore.score < 60,
    },
    ruleScore,
    ruleScore.score,
  );

  return {
    result,
    metadata: {
      gradingMethod: 'rule-fallback',
      gradingModel: null,
      gradingVersion: GRADING_VERSION,
      fallbackNotice: '현재 AI 채점이 불안정하여 규칙 기반 채점으로 대체되었습니다.',
      rawGradingResult: {
        gradingVersion: GRADING_VERSION,
        fallbackReason,
        ruleScore,
      },
    } satisfies GradingMetadata,
  };
}

function normalizeGradeErrorMessage(message: string) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('openai_api_key')) {
    return 'AI채점 서버 설정이 비어 있습니다. Cloudflare Pages 환경변수 OPENAI_API_KEY를 확인해 주세요.';
  }

  if (lower.includes('openai api 호출에 실패')) {
    return 'AI채점 서버가 OpenAI에 연결하지 못했습니다. OPENAI_API_KEY와 Functions 배포 상태를 확인해 주세요.';
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'AI채점 서버에 연결하지 못했습니다. Cloudflare Pages Functions 배포와 도메인 연결 상태를 확인해 주세요.';
  }

  if (lower.includes('country, region, or territory not supported')) {
    return '현재 AI채점 서버의 호출 지역이 OpenAI 지원 대상이 아니어서 로컬 기준 채점으로 대체합니다.';
  }

  return normalized || 'AI채점 응답을 처리하지 못했습니다.';
}

async function invokeSupabaseGrade(input: GradeAnswerInput) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('grade', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'Supabase Edge Function 호출에 실패했습니다.');
  }

  return data as GradeApiResponse;
}

async function invokePagesGrade(input: GradeAnswerInput) {
  const response = await fetch(GRADE_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  let data: GradeApiResponse | null = null;
  try {
    data = (await response.json()) as GradeApiResponse;
  } catch {
    data = null;
  }

  return { response, data };
}

function buildSkippedResult() {
  const result = normalizeScoringResult({
    score: 0,
    reason: '답안이 작성되지 않았습니다.',
    shouldAddWrongNote: true,
  });

  return {
    result,
    metadata: {
      gradingMethod: 'rule',
      gradingModel: null,
      gradingVersion: GRADING_VERSION,
      rawGradingResult: { ...result, gradingVersion: GRADING_VERSION },
    } satisfies GradingMetadata,
  };
}

export async function gradeAnswer(input: GradeAnswerInput): Promise<{
  result: ScoringResult;
  metadata: GradingMetadata;
}> {
  if (isSkippedAnswer(input.userAnswer)) {
    return buildSkippedResult();
  }

  try {
    let data: GradeApiResponse | null = null;

    try {
      data = await invokeSupabaseGrade(input);
    } catch {
      data = null;
    }

    if (!data?.result) {
      try {
        const pagesResult = await invokePagesGrade(input);
        if (!pagesResult.response.ok || !pagesResult.data?.result) {
          const normalizedError = normalizeGradeErrorMessage(
            pagesResult.data?.error || 'AI채점 응답을 처리하지 못했습니다.',
          );
          return buildLocalFallbackResult(input, normalizedError);
        }
        data = pagesResult.data;
      } catch (error) {
        return buildLocalFallbackResult(
          input,
          normalizeGradeErrorMessage(error instanceof Error ? error.message : `Failed to fetch ${GRADE_API_PATH}`),
        );
      }
    }

    const resultPayload = data.result!;
    const ruleScore = computeRuleScore(input);
    const aiScore = typeof resultPayload.score === 'number' ? resultPayload.score : Number.NaN;
    const status = resultPayload.resultStatus;
    if (!Number.isFinite(aiScore) || !['EXCELLENT', 'CORRECT', 'REVIEW', 'WRONG', 'SKIPPED'].includes(String(status))) {
      return buildLocalFallbackResult(input, 'invalid_ai_payload');
    }

    const result = finalizeResult(resultPayload, ruleScore, blendScore(aiScore, ruleScore.score));

    return {
      result,
      metadata: {
        gradingMethod: data.metadata?.gradingMethod ?? 'ai',
        gradingModel: data.metadata?.gradingModel ?? null,
        gradingVersion: data.metadata?.gradingVersion ?? GRADING_VERSION,
        fallbackNotice: data.metadata?.fallbackNotice ?? null,
        rawGradingResult: data.metadata?.rawGradingResult ?? {
          gradingVersion: GRADING_VERSION,
          ruleScore,
          aiResult: resultPayload,
        },
      },
    };
  } catch (error) {
    return buildLocalFallbackResult(
      input,
      normalizeGradeErrorMessage(error instanceof Error ? error.message : 'AI채점 처리 중 알 수 없는 오류가 발생했습니다.'),
    );
  }
}
