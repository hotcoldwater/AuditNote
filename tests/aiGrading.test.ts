import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

import { gradeAnswer } from '../src/lib/aiGrading';

const baseInput = {
  title: '감사인의 독립성',
  correctAnswer: '감사인은 독립성과 객관성을 유지해야 한다.',
  userAnswer: '감사인은 독립성과 객관성을 유지해야 한다.',
  requiredKeywords: ['독립성', '객관성'],
  optionalKeywords: ['신뢰성'],
};

describe('gradeAnswer fallback (AI 호출 실패 시 규칙 기반 채점)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('/api/grade 호출이 네트워크 오류로 실패하면 규칙 기반 채점으로 대체한다', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result, metadata } = await gradeAnswer(baseInput);

    expect(metadata.gradingMethod).toBe('rule-fallback');
    expect(metadata.fallbackNotice).toContain('규칙 기반 채점');
    expect(result.score).toBeGreaterThan(0);
  });

  it('/api/grade가 에러 응답을 반환하면 규칙 기반 채점으로 대체한다', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'OpenAI API 호출에 실패했습니다.' }),
    });

    const { metadata } = await gradeAnswer(baseInput);

    expect(metadata.gradingMethod).toBe('rule-fallback');
  });

  it('AI 응답 payload가 잘못된 형태이면(score 누락) 규칙 기반 채점으로 대체한다', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { resultStatus: 'CORRECT', reason: '이유' } }),
    });

    const { metadata } = await gradeAnswer(baseInput);

    expect(metadata.gradingMethod).toBe('rule-fallback');
    expect(metadata.rawGradingResult).toMatchObject({ fallbackReason: 'invalid_ai_payload' });
  });

  it('AI 응답이 정상이면 규칙 기반 fallback을 타지 않고 AI 결과를 사용한다', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: { score: 88, resultStatus: 'CORRECT', reason: '정확한 답안입니다.' },
        metadata: { gradingMethod: 'ai', gradingModel: 'gpt-test' },
      }),
    });

    const { metadata } = await gradeAnswer(baseInput);

    expect(metadata.gradingMethod).toBe('ai');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('미응답 답안은 AI 호출 없이 바로 SKIPPED 처리한다', async () => {
    const { result, metadata } = await gradeAnswer({ ...baseInput, userAnswer: '모르겠어요' });

    expect(result.resultStatus).toBe('SKIPPED');
    expect(metadata.gradingMethod).toBe('rule');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
