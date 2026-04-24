import type { ScoringResult, Standard } from '../types';
import { formatAnswerForDisplay, formatExamYears, getStandardSourceRefText } from '../lib/standardDisplay';
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

const SectionTitle = styled('div', {
  fontSize: '$2',
  color: '$primary',
  fontWeight: 700,
  lineHeight: 1.6,
});

const Reference = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

const AnswerMeta = styled('div', {
  display: 'grid',
  gap: '$1',
});

const AnswerMetaTitle = styled('div', {
  fontSize: '$3',
  color: '$primary',
  fontWeight: 700,
  lineHeight: 1.5,
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
  const examYears = formatExamYears(standard.exam_years);

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
              fontFamily: '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
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
          <AnswerMeta>
            <AnswerMetaTitle>{`Lv${standard.level}. ${standard.title}`}</AnswerMetaTitle>
            <SectionTitle>{getStandardSourceRefText(standard)}</SectionTitle>
            {examYears ? <Reference>{`출제연도 ${examYears}`}</Reference> : null}
          </AnswerMeta>
          <Body>{formatAnswerForDisplay(standard.answer)}</Body>
        </Section>
        <Section>
          <Reference>내 답안</Reference>
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
