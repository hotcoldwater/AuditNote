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
    throw new Error(normalizeGradeErrorMessage(data?.error || 'AI 채점 응답을 처리하지 못했습니다.'));
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
