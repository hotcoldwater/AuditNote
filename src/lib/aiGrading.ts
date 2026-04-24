import type { GradingMetadata, ScoringResult } from '../types';
import { isSkippedAnswer, normalizeScoringResult } from './scoring';

interface GradeAnswerInput {
  title: string;
  correctAnswer: string;
  userAnswer: string;
}

interface GradeApiResponse {
  result: ScoringResult;
  metadata?: Partial<GradingMetadata>;
  error?: string;
}

function stripBulletPrefix(value: string) {
  return value.replace(/^\s*(?:\d+\)|\d+\.\s*|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮㉠㉡㉢㉣㉤㉥㉦㉧]|[-*])\s*/u, '').trim();
}

function splitIntoUnits(value: string) {
  return String(value ?? '')
    .replace(/\\n/g, '\n')
    .split(/\r?\n+/)
    .map((line) => stripBulletPrefix(line))
    .filter(Boolean);
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
    .filter(Boolean);
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

function buildLocalFallbackResult(input: GradeAnswerInput) {
  const score = computeSentenceScore(input.correctAnswer, input.userAnswer);
  const result = normalizeScoringResult({
    score,
    reason:
      score >= 75
        ? 'AI 채점 연결이 불안정하여 로컬 기준으로 채점했으며 핵심 문장은 대체로 충족했습니다.'
        : 'AI 채점 연결이 불안정하여 로컬 기준으로 채점했으며 핵심 문장 일부가 부족합니다.',
    shouldAddWrongNote: score < 75,
  });

  return {
    result,
    metadata: {
      gradingMethod: 'rule-fallback',
      gradingModel: null,
      rawGradingResult: {
        fallbackReason: 'unsupported_region_or_api_unavailable',
        score,
      },
    } satisfies GradingMetadata,
  };
}

function normalizeGradeErrorMessage(message: string) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('openai_api_key')) {
    return 'AI 채점 서버 설정이 비어 있습니다. Cloudflare Pages 환경변수 OPENAI_API_KEY를 확인해 주세요.';
  }

  if (lower.includes('openai api 호출에 실패')) {
    return 'AI 채점 서버가 OpenAI에 연결하지 못했습니다. OPENAI_API_KEY와 Functions 배포 상태를 확인해 주세요.';
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'AI 채점 서버에 연결하지 못했습니다. Cloudflare Pages Functions 배포와 도메인 연결 상태를 확인해 주세요.';
  }

  if (lower.includes('country, region, or territory not supported')) {
    return '현재 AI 채점 서버의 호출 지역이 OpenAI 지원 대상이 아니어서 로컬 기준 채점으로 대체합니다.';
  }

  return normalized || 'AI 채점 응답을 처리하지 못했습니다.';
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
      rawGradingResult: { ...result },
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

  let response: Response;
  try {
    response = await fetch('/api/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw new Error(
      normalizeGradeErrorMessage(error instanceof Error ? error.message : 'Failed to fetch /api/grade'),
    );
  }

  let data: GradeApiResponse | null = null;
  try {
    data = (await response.json()) as GradeApiResponse;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.result) {
    const normalizedError = normalizeGradeErrorMessage(data?.error || 'AI 채점 응답을 처리하지 못했습니다.');
    if (normalizedError.includes('로컬 기준 채점으로 대체합니다')) {
      return buildLocalFallbackResult(input);
    }
    throw new Error(normalizedError);
  }

  const result = normalizeScoringResult(data.result);

  return {
    result,
    metadata: {
      gradingMethod: data.metadata?.gradingMethod ?? 'ai',
      gradingModel: data.metadata?.gradingModel ?? null,
      rawGradingResult: data.metadata?.rawGradingResult ?? { ...result },
    },
  };
}
