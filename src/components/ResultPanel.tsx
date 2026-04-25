import type { GradingMetadata, ScoringResult, Standard } from '../types';
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

const TitleRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  flexWrap: 'wrap',
});

const LevelBox = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '42px',
  minHeight: '28px',
  padding: '0 10px',
  border: '1px solid $border',
  backgroundColor: '$primarySoft',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
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

const Hint = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

const List = styled('ul', {
  margin: 0,
  paddingLeft: '18px',
  display: 'grid',
  gap: '$1',
  color: '$mutedText',
  lineHeight: 1.7,
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
  metadata,
  onAddWrongNote,
  onNext,
  onExit,
}: {
  standard: Standard;
  userAnswer: string;
  result: ScoringResult;
  metadata: GradingMetadata | null;
  onAddWrongNote: () => Promise<void> | void;
  onNext: () => void;
  onExit: () => void;
}) {
  const examYears = formatExamYears(standard.exam_years);

  return (
    <Card css={{ display: 'grid', gap: '$6', '&::before': { display: 'none' } }}>
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
        <span style={{ color: '#5f6764', lineHeight: 1.7 }}>{result.reason}</span>
        <span style={{ color: '#2457a6', lineHeight: 1.7 }}>잘 쓴 부분: {result.goodPart}</span>
        <span style={{ color: '#b93a3a', lineHeight: 1.7 }}>잘못 쓴 부분: {result.badPart}</span>
        {result.shouldRecommendReview ? <Hint>복습 권장</Hint> : null}
        {metadata?.fallbackNotice ? <Hint>{metadata.fallbackNotice}</Hint> : null}
        {result.missingPoints?.length ? (
          <Section>
            <Reference>빠뜨린 핵심 요소</Reference>
            <List>
              {result.missingPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </List>
          </Section>
        ) : null}
        {result.wrongConcepts?.length ? (
          <Section>
            <Reference>오개념</Reference>
            <List>
              {result.wrongConcepts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </List>
          </Section>
        ) : null}
      </div>

      <Stack>
        <Section>
          <AnswerMeta>
            <TitleRow>
              <LevelBox>{`Lv${standard.level}`}</LevelBox>
              <AnswerMetaTitle>{standard.title}</AnswerMetaTitle>
            </TitleRow>
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
      {metadata?.gradingVersion ? <Hint>{metadata.gradingVersion}</Hint> : null}
    </Card>
  );
}
