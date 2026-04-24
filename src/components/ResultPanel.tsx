import type { ScoringResult, Standard } from '../types';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Section = styled('div', {
  display: 'grid',
  gap: '$2',
});

const Label = styled('div', {
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
});

const Body = styled('div', {
  backgroundColor: '$panel',
  borderRadius: '$md',
  padding: '$5',
  lineHeight: 1.9,
  whiteSpace: 'pre-wrap',
  border: '1px solid $borderSoft',
  wordBreak: 'keep-all',
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
  onAddWrongNote,
  onNext,
  onExit,
}: {
  standard: Standard;
  userAnswer: string;
  result: ScoringResult;
  onAddWrongNote: () => Promise<void> | void;
  onNext: () => void;
  onExit: () => void;
}) {
  return (
    <Card css={{ display: 'grid', gap: '$6' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Badge tone={badgeTone(result.score) as 'success' | 'primary' | 'warning' | 'danger'}>
            {result.resultStatus}
          </Badge>
          <strong
            style={{
              fontSize: 32,
              fontFamily: '"SUIT Variable", "SUIT", "Pretendard Variable", sans-serif',
              color: '#173d7a',
            }}
          >
            {result.score}점
          </strong>
        </div>
        <span style={{ color: '#5f6764', lineHeight: 1.7 }}>판정: {result.resultStatus}</span>
        <span style={{ color: '#5f6764', lineHeight: 1.7 }}>{result.reason}</span>
      </div>

      <Stack>
        <Section>
          <Label>정답 원문</Label>
          <Body>{standard.answer}</Body>
        </Section>
        <Section>
          <Label>내 답안</Label>
          <Body>{userAnswer.trim() || '미응답'}</Body>
        </Section>
      </Stack>

      <div style={{ display: 'grid', gap: 12 }}>
        <Button tone="ghost" onClick={() => void onAddWrongNote()}>
          오답노트 추가
        </Button>
        <Button onClick={onNext}>다음 문제</Button>
        <Button tone="secondary" onClick={onExit}>
          학습 종료
        </Button>
      </div>
    </Card>
  );
}
