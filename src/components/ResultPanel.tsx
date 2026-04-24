import type { ScoringResult, Standard, StudyMode } from '../types';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Section = styled('div', {
  display: 'grid',
  gap: '$2',
});

const Label = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
});

const Body = styled('div', {
  backgroundColor: '$surface',
  borderRadius: '$md',
  padding: '$4',
  lineHeight: 1.7,
  whiteSpace: 'pre-wrap',
});

function badgeTone(score: number) {
  if (score >= 90) {
    return 'success';
  }
  if (score >= 75) {
    return 'primary';
  }
  if (score >= 60) {
    return 'warning';
  }
  return 'danger';
}

export function ResultPanel({
  standard,
  userAnswer,
  result,
  mode,
  persistenceNotice,
  onAddWrongNote,
  onResolveWrongNote,
  onNext,
  onExit,
}: {
  standard: Standard;
  userAnswer: string;
  result: ScoringResult;
  mode: StudyMode;
  persistenceNotice?: string;
  onAddWrongNote: () => Promise<void> | void;
  onResolveWrongNote?: () => Promise<void> | void;
  onNext: () => void;
  onExit: () => void;
}) {
  return (
    <Card css={{ display: 'grid', gap: '$5' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Badge tone={badgeTone(result.score) as 'success' | 'primary' | 'warning' | 'danger'}>
          {result.resultStatus}
        </Badge>
        <strong style={{ fontSize: 28 }}>{result.score}점</strong>
        <span style={{ color: '#777777' }}>{result.feedbackMessage}</span>
      </div>

      {persistenceNotice ? (
        <div style={{ color: '#B7791F', fontSize: 14, lineHeight: 1.6 }}>{persistenceNotice}</div>
      ) : null}

      <Grid>
        <Section>
          <Label>정답 원문</Label>
          <Body>{standard.answer}</Body>
        </Section>
        <Section>
          <Label>내 답안</Label>
          <Body>{userAnswer.trim() || '미응답'}</Body>
        </Section>
        <Section>
          <Label>포함한 필수 키워드</Label>
          <Body>{result.includedRequiredKeywords.join(', ') || '없음'}</Body>
        </Section>
        <Section>
          <Label>빠진 필수 키워드</Label>
          <Body>{result.missingRequiredKeywords.join(', ') || '없음'}</Body>
        </Section>
        <Section>
          <Label>포함한 선택 키워드</Label>
          <Body>{result.includedOptionalKeywords.join(', ') || '없음'}</Body>
        </Section>
        <Section>
          <Label>답안 충실도 / 원문 유사도</Label>
          <Body>
            답안 길이 비율 {Math.round(result.answerLengthRatio * 100)}% · 유사도 점수 {result.similarityScore}
          </Body>
        </Section>
      </Grid>

      <div style={{ display: 'grid', gap: 12 }}>
        <Button tone="ghost" onClick={() => void onAddWrongNote()}>
          오답노트 추가
        </Button>
        {mode === 'WRONG_NOTE' && onResolveWrongNote ? (
          <Button tone="secondary" onClick={() => void onResolveWrongNote()}>
            오답노트에서 제거
          </Button>
        ) : null}
        <Button onClick={onNext}>다음 문제</Button>
        <Button tone="secondary" onClick={onExit}>
          학습 종료
        </Button>
      </div>
    </Card>
  );
}
