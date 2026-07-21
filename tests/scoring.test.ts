import { describe, expect, it } from 'vitest';
import { deriveResultStatus, isSkippedAnswer, normalizeScoringResult } from '../src/lib/scoring';

describe('deriveResultStatus', () => {
  it('정답: 90점 이상은 EXCELLENT', () => {
    expect(deriveResultStatus(100)).toBe('EXCELLENT');
    expect(deriveResultStatus(90)).toBe('EXCELLENT');
  });

  it('정답: 75~89점은 CORRECT', () => {
    expect(deriveResultStatus(89)).toBe('CORRECT');
    expect(deriveResultStatus(75)).toBe('CORRECT');
  });

  it('부분점수: 60~74점은 REVIEW(복습 권장)', () => {
    expect(deriveResultStatus(74)).toBe('REVIEW');
    expect(deriveResultStatus(60)).toBe('REVIEW');
  });

  it('오답: 1~59점은 WRONG', () => {
    expect(deriveResultStatus(59)).toBe('WRONG');
    expect(deriveResultStatus(1)).toBe('WRONG');
  });

  it('미응답: 0점은 SKIPPED', () => {
    expect(deriveResultStatus(0)).toBe('SKIPPED');
  });
});

describe('normalizeScoringResult', () => {
  it('점수 범위를 0~100으로 clamp한다', () => {
    const over = normalizeScoringResult({ score: 150, reason: '만점 초과', shouldAddWrongNote: false });
    const under = normalizeScoringResult({ score: -20, reason: '음수 점수', shouldAddWrongNote: false });

    expect(over.score).toBe(100);
    expect(under.score).toBe(0);
  });

  it('reason이 비어 있으면 기본 문구로 대체한다', () => {
    const result = normalizeScoringResult({ score: 80, reason: '   ', shouldAddWrongNote: false });
    expect(result.reason).toBe('채점 사유가 제공되지 않았습니다.');
  });

  it('WRONG/SKIPPED 상태는 원래 값과 무관하게 오답노트 등록을 강제한다', () => {
    const wrong = normalizeScoringResult({ score: 40, reason: '오답', shouldAddWrongNote: false });
    const skipped = normalizeScoringResult({ score: 0, reason: '미응답', shouldAddWrongNote: false });

    expect(wrong.resultStatus).toBe('WRONG');
    expect(wrong.shouldAddWrongNote).toBe(true);
    expect(skipped.resultStatus).toBe('SKIPPED');
    expect(skipped.shouldAddWrongNote).toBe(true);
  });

  it('REVIEW 상태에서만 shouldRecommendReview가 true다', () => {
    const review = normalizeScoringResult({ score: 65, reason: '애매', shouldAddWrongNote: false });
    const correct = normalizeScoringResult({ score: 80, reason: '정답', shouldAddWrongNote: false });

    expect(review.shouldRecommendReview).toBe(true);
    expect(correct.shouldRecommendReview).toBe(false);
  });
});

describe('isSkippedAnswer', () => {
  it('빈 문자열은 스킵으로 처리한다', () => {
    expect(isSkippedAnswer('')).toBe(true);
  });

  it('모르겠어요 계열 표현은 스킵으로 처리한다', () => {
    expect(isSkippedAnswer('모르겠어요')).toBe(true);
    expect(isSkippedAnswer('모름')).toBe(true);
  });

  it('대소문자/공백/문장부호가 섞여도 스킵 후보를 인식한다', () => {
    expect(isSkippedAnswer('  Skip! ')).toBe(true);
    expect(isSkippedAnswer('PASS.')).toBe(true);
  });

  it('반복된 ㅠ/ㅜ 표현은 스킵으로 처리한다', () => {
    expect(isSkippedAnswer('ㅠㅠㅠㅠ')).toBe(true);
    expect(isSkippedAnswer('ㅜㅜ')).toBe(true);
  });

  it('실제 서술형 답안은 스킵으로 처리하지 않는다', () => {
    expect(isSkippedAnswer('감사인은 독립성과 객관성을 유지해야 한다.')).toBe(false);
  });
});
