import type { ScoringResult, Standard, StudyMode } from '../types';
import { formatDisplayAnswer } from '../lib/answerFormatting';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
  '@sm': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
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
  const formattedAnswer = formatDisplayAnswer(standard.answer);

  return (
    <Card css={{ display: 'grid', gap: '$6' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Badge tone={badgeTone(result.score) as 'success' | 'primary' | 'warning' | 'danger'}>
            {result.resultStatus}
          </Badge>
          <strong style={{ fontSize: 32, fontFamily: 'Newsreader, Noto Serif KR, serif', color: '#01261f' }}>{result.score}점</strong>
        </div>
        <span style={{ color: '#5f6764', lineHeight: 1.7 }}>{result.feedbackMessage}</span>
      </div>

      {persistenceNotice ? (
        <div style={{ color: '#7b5a19', fontSize: 14, lineHeight: 1.6 }}>{persistenceNotice}</div>
      ) : null}

      <Grid>
        <Section>
          <Label>정답 정리본</Label>
          <Body>{formattedAnswer}</Body>
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
