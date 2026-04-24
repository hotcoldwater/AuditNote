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

  const response = await fetch('/api/grade', {
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

  if (!response.ok || !data?.result) {
    throw new Error(data?.error || 'AI 채점 응답을 처리하지 못했습니다.');
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
