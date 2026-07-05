import { useState } from 'react';
import type { ExamGradingPayload, ExamQuestion, GradingMetadata, IssueReportType, ScoringResult } from '../types';
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
  onReportIssue,
  onNext,
  onExit,
}: {
  question: ExamQuestion;
  userAnswer: string;
  result: ScoringResult;
  details: ExamGradingPayload;
  metadata: GradingMetadata | null;
  onReportIssue: (reportType: IssueReportType, detail?: string) => Promise<string | void> | string | void;
  onNext: () => void;
  onExit: () => void;
}) {
  const detailLines = [
    ...details.missingPoints.map((item) => `- ${item}`),
    ...details.wrongPoints.map((item) => `- ${item}`),
  ];
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<IssueReportType | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportNotice, setReportNotice] = useState<string | null>(null);

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
              color: 'var(--colors-primary)',
            }}
          >
            {result.score}점
          </strong>
        </div>
        <span style={{ color: 'var(--colors-mutedText)', lineHeight: 1.7 }}>{details.summary}</span>
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
        <Button tone="ghost" onClick={() => setReportOpen((prev) => !prev)}>
          이의제기
        </Button>
        {reportOpen ? (
          <Section css={{ padding: '$4', border: '1px solid $borderSoft', backgroundColor: '$surface' }}>
            <Label>신고 사유</Label>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button
                tone={reportType === 'QUESTION_AMBIGUOUS' ? 'primary' : 'secondary'}
                onClick={() => setReportType('QUESTION_AMBIGUOUS')}
              >
                1. 문제가 애매함
              </Button>
              <Button
                tone={reportType === 'ANSWER_INCORRECT' ? 'primary' : 'secondary'}
                onClick={() => setReportType('ANSWER_INCORRECT')}
              >
                2. 답안이 이상함
              </Button>
              <Button
                tone={reportType === 'GRADING_INCORRECT' ? 'primary' : 'secondary'}
                onClick={() => setReportType('GRADING_INCORRECT')}
              >
                3. 채점이 이상함
              </Button>
            </div>
            <textarea
              placeholder="추가 설명이 있으면 적어 주세요. 비워도 신고는 가능합니다."
              value={reportDetail}
              onChange={(event) => setReportDetail(event.target.value)}
              style={{
                width: '100%',
                minHeight: 96,
                border: '1px solid #ded9d1',
                backgroundColor: '#fffdf9',
                color: '#263431',
                padding: 16,
                resize: 'vertical',
                fontFamily: '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                fontSize: 13,
                lineHeight: 1.7,
              }}
            />
            <Button
              onClick={async () => {
                if (!reportType) {
                  setReportNotice('이의제기 종류를 먼저 선택해 주세요.');
                  return;
                }
                const notice = await onReportIssue(reportType, reportDetail);
                setReportNotice(typeof notice === 'string' ? notice : '신고가 접수되었습니다.');
                setReportType(null);
                setReportDetail('');
              }}
            >
              이의제기 제출
            </Button>
            {reportNotice ? <Hint>{reportNotice}</Hint> : null}
          </Section>
        ) : null}
        <Button onClick={onNext}>다음 문제</Button>
        <Button tone="secondary" onClick={onExit}>
          기출노트 종료
        </Button>
      </div>
    </Card>
  );
}
