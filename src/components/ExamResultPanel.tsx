import type { ExamGradingPayload, ExamQuestion, GradingMetadata, ScoringResult } from '../types';
import { formatExamText } from '../lib/examQuestions';
import { styled } from '../styles/stitches.config';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { RichTextContent } from './RichTextContent';

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
  color: '$primary',
  fontWeight: 700,
  lineHeight: 1.6,
});

const Body = styled('div', {
  backgroundColor: '$panel',
  border: '1px solid $borderSoft',
  padding: '$5',
  lineHeight: 1.9,
  wordBreak: 'keep-all',
});

const Hint = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

const WarningText = styled('div', {
  fontSize: '$2',
  color: '$danger',
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

function formatExamMeta(question: ExamQuestion) {
  const year = question.exam_years.join(', ');
  const source = question.source_page ? `출처 ${question.source_page}` : '';
  return [year ? `출제 ${year}` : '', source].filter(Boolean).join(' · ');
}

export function ExamResultPanel({
  question,
  userAnswer,
  result,
  details,
  metadata,
  onNext,
  onExit,
}: {
  question: ExamQuestion;
  userAnswer: string;
  result: ScoringResult;
  details: ExamGradingPayload;
  metadata: GradingMetadata | null;
  onNext: () => void;
  onExit: () => void;
}) {
  const detailLines = [
    ...details.missingPoints.map((item) => `- ${item}`),
    ...details.wrongPoints.map((item) => `- ${item}`),
  ];

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
        <span style={{ color: '#5f6764', lineHeight: 1.7 }}>{details.summary}</span>
        {detailLines.length > 0 ? <WarningText>{detailLines.join('\n')}</WarningText> : null}
        <Hint>{details.advice}</Hint>
        {metadata?.fallbackNotice ? <Hint>{metadata.fallbackNotice}</Hint> : null}
      </div>

      <Stack>
        <Section>
          <Label>{formatExamMeta(question)}</Label>
          <Label>모범답안</Label>
          <Body>
            <RichTextContent value={formatExamText(details.modelAnswer || question.answer_text)} />
          </Body>
        </Section>
        {details.correctPoints.length > 0 ? (
          <Section>
            <Label>맞게 쓴 부분</Label>
            <Body>
              <RichTextContent value={formatExamText(details.correctPoints.map((item) => `- ${item}`).join('\n'))} />
            </Body>
          </Section>
        ) : null}
        <Section>
          <Label>내 답안</Label>
          <Body>
            <RichTextContent value={formatExamText(userAnswer.trim() || '미응답')} />
          </Body>
        </Section>
      </Stack>

      <div style={{ display: 'grid', gap: 12 }}>
        <Button onClick={onNext}>다음 문제</Button>
        <Button tone="secondary" onClick={onExit}>
          기출노트 종료
        </Button>
      </div>
    </Card>
  );
}
