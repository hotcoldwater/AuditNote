import { useState } from 'react';
import type { GradingMetadata, IssueReportType, ScoringResult, Standard } from '../types';
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

const TextInput = styled('textarea', {
  width: '100%',
  minHeight: '96px',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
  color: '$text',
  padding: '$4',
  resize: 'vertical',
  fontFamily: '$body',
  fontSize: '$2',
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

function buildDetailFeedback(metadata: GradingMetadata | null) {
  const raw = metadata?.rawGradingResult;
  const ruleScore = raw && typeof raw === 'object' && 'ruleScore' in raw ? raw.ruleScore : null;

  if (!ruleScore || typeof ruleScore !== 'object') {
    return null;
  }

  const missingPoints =
    'missingPoints' in ruleScore && Array.isArray(ruleScore.missingPoints)
      ? ruleScore.missingPoints.map((item) => String(item).trim()).filter(Boolean)
      : [];
  const wrongConcepts =
    'detectedWrongConcepts' in ruleScore && Array.isArray(ruleScore.detectedWrongConcepts)
      ? ruleScore.detectedWrongConcepts.map((item) => String(item).trim()).filter(Boolean)
      : [];

  if (missingPoints.length === 0 && wrongConcepts.length === 0) {
    return null;
  }

  const missingText = (() => {
    if (missingPoints.length === 0) {
      return '';
    }

    if (missingPoints.length === 1) {
      return `${missingPoints[0]} 관련 설명이 빠져 감점되었습니다.`;
    }

    return `${missingPoints.slice(0, 3).join(', ')} 관련 설명이 부족해 핵심 요건 충족도가 낮아졌습니다.`;
  })();
  const wrongConceptText =
    wrongConcepts.length > 0
      ? `${wrongConcepts.slice(0, 2).join(', ')}${wrongConcepts.length > 2 ? ' 등' : ''}처럼 오해될 표현이 있어 추가 감점되었습니다.`
      : '';

  return [missingText, wrongConceptText].filter(Boolean).join(' ');
}

export function ResultPanel({
  standard,
  userAnswer,
  result,
  metadata,
  onAddWrongNote,
  onReportIssue,
  onNext,
  onExit,
}: {
  standard: Standard;
  userAnswer: string;
  result: ScoringResult;
  metadata: GradingMetadata | null;
  onAddWrongNote: () => Promise<void> | void;
  onReportIssue: (reportType: IssueReportType, detail?: string) => Promise<string | void> | string | void;
  onNext: () => void;
  onExit: () => void;
}) {
  const examYears = formatExamYears(standard.exam_years);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<IssueReportType | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const canManualAdd = result.resultStatus === 'CORRECT' || result.resultStatus === 'EXCELLENT';
  const detailFeedback = buildDetailFeedback(metadata);

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
        {detailFeedback ? <span style={{ color: '#b93a3a', lineHeight: 1.7 }}>{detailFeedback}</span> : null}
        {result.shouldRecommendReview ? <Hint>복습 권장</Hint> : null}
        {metadata?.fallbackNotice ? <Hint>{metadata.fallbackNotice}</Hint> : null}
      </div>

      <Stack>
        <Section>
          <AnswerMeta>
            <TitleRow>
              <LevelBox>{`Lv${standard.level}`}</LevelBox>
              <AnswerMetaTitle>{standard.title}</AnswerMetaTitle>
            </TitleRow>
            <SectionTitle>{getStandardSourceRefText(standard)}</SectionTitle>
            {examYears ? <Reference>{`출제: ${examYears}`}</Reference> : null}
          </AnswerMeta>
          <Reference>모범답안</Reference>
          <Body>{formatAnswerForDisplay(standard.answer)}</Body>
        </Section>
        <Section>
          <Reference>내 답안</Reference>
          <Body>{userAnswer.trim() || '미응답'}</Body>
        </Section>
      </Stack>

      <div style={{ display: 'grid', gap: 12 }}>
        {canManualAdd ? (
          <Button tone="ghost" onClick={() => void onAddWrongNote()}>
            오답노트로 보내기
          </Button>
        ) : null}
        <Button tone="ghost" onClick={() => setReportOpen((prev) => !prev)}>
          이의제기
        </Button>
        {reportOpen ? (
          <Section css={{ padding: '$4', border: '1px solid $borderSoft', backgroundColor: '$surface' }}>
            <Reference>신고 사유</Reference>
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
            <TextInput
              placeholder="추가 설명이 있으면 적어 주세요. 비워도 신고는 가능합니다."
              value={reportDetail}
              onChange={(event) => setReportDetail(event.target.value)}
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
          학습 종료
        </Button>
      </div>
      {metadata?.gradingVersion ? <Hint>{metadata.gradingVersion}</Hint> : null}
    </Card>
  );
}
