import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradeAnswer } from '../lib/aiGrading';
import { recordStudyOutcome, loadUserStandardStatsMap } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { submitIssueReport } from '../lib/issueReports';
import { pickRandomWrongStandard, pickWeightedRandomStandard } from '../lib/questionPicker';
import { getStandardLocationLines } from '../lib/standardDisplay';
import { fetchActiveStandards, sortStandardsForStudySequence } from '../lib/standards';
import { manuallyAddWrongNote, listWrongNotes } from '../lib/wrongNotes';
import type { GradingMetadata, ScoringResult, Standard, StudyMode } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { ResultPanel } from './ResultPanel';
import { Textarea } from './Textarea';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$6',
});

const Title = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.26,
  color: '$primary',
});

const TitleRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$3',
  flexWrap: 'wrap',
});

const LevelBox = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '48px',
  minHeight: '34px',
  padding: '0 12px',
  border: '1px solid $border',
  backgroundColor: '$primarySoft',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

const LocationBlock = styled('div', {
  display: 'grid',
  gap: '$2',
  padding: '$5',
  borderRadius: '$xl',
  backgroundColor: '$panel',
  border: '1px solid rgba(112, 146, 214, 0.16)',
});

const PartLine = styled('div', {
  color: '$primary',
  fontSize: '$4',
  lineHeight: 1.3,
  fontWeight: 700,
  letterSpacing: '-0.02em',
});

const ChapterLine = styled('div', {
  color: '$accent',
  fontSize: '$3',
  lineHeight: 1.4,
  fontWeight: 700,
  letterSpacing: '-0.02em',
});

const SectionLine = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.6,
  fontWeight: 700,
  paddingLeft: '$4',
  borderLeft: '2px solid rgba(112, 146, 214, 0.22)',
});

const Notice = styled('div', {
  fontSize: '$2',
  color: '$warning',
  lineHeight: 1.6,
});

const QuestionCard = styled(Card, {
  display: 'grid',
  gap: '$6',
});

const MetaSection = styled('section', {
  display: 'grid',
  gap: '$4',
});

export function SessionPlayer({
  mode,
  partNo,
  chapterNo,
  preferredStandardId,
  examOnly,
  wrongStatuses,
}: {
  mode: StudyMode;
  partNo?: number | null;
  chapterNo?: number | null;
  preferredStandardId?: string | null;
  examOnly?: boolean;
  wrongStatuses?: Array<'WRONG' | 'REVIEW'>;
}) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | undefined>();
  const [submitNotice, setSubmitNotice] = useState<string | undefined>();
  const [current, setCurrent] = useState<Standard | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [gradingMetadata, setGradingMetadata] = useState<GradingMetadata | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function pickSequentialStandard(
    standards: Standard[],
    nextPreferredStandardId?: string | null,
    excludeStandardId?: string | null,
  ) {
    if (standards.length === 0) {
      return null;
    }

    if (excludeStandardId) {
      const currentIndex = standards.findIndex((item) => item.id === excludeStandardId);
      if (currentIndex >= 0) {
        return standards[currentIndex + 1] ?? null;
      }
    }

    if (nextPreferredStandardId) {
      const preferred = standards.find((item) => item.id === nextPreferredStandardId);
      if (preferred) {
        return preferred;
      }
    }

    return standards[0] ?? null;
  }

  async function loadQuestion(excludeStandardId?: string | null) {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setResult(null);
    setGradingMetadata(null);
    setAnswer('');
    setSubmitNotice(undefined);

    try {
      const statsMap = await loadUserStandardStatsMap(user.id);

      if (mode === 'WRONG_NOTE') {
        const [standardsPayload, wrongNotes] = await Promise.all([fetchActiveStandards(), listWrongNotes(user.id, false, wrongStatuses)]);

        const wrongIds = new Set(wrongNotes.filter((item) => !item.is_resolved).map((item) => item.standard_id));
        const candidates = standardsPayload.standards.filter((item) => wrongIds.has(item.id));
        const nextStandard = pickRandomWrongStandard(candidates, preferredStandardId, excludeStandardId);
        setNotice(standardsPayload.notice);
        setCurrent(nextStandard);
        setAnswer('');
      } else if (mode === 'SELECT') {
        const standardsPayload = await fetchActiveStandards(partNo);
        const chapterStandards = sortStandardsForStudySequence(
          standardsPayload.standards.filter((item) => item.chapter_no === chapterNo),
        );
        const nextStandard = pickSequentialStandard(chapterStandards, preferredStandardId, excludeStandardId);
        setNotice(standardsPayload.notice);
        setCurrent(nextStandard);
        setAnswer('');
      } else {
        const standardsPayload = await fetchActiveStandards(mode === 'PART' ? partNo : undefined);
        const candidates = examOnly
          ? standardsPayload.standards.filter((item) => Array.isArray(item.exam_years) && item.exam_years.length > 0)
          : standardsPayload.standards;
        const nextStandard = pickWeightedRandomStandard(candidates, statsMap, excludeStandardId);
        setNotice(standardsPayload.notice);
        setCurrent(nextStandard);
        setAnswer('');
      }
    } catch {
      setCurrent(null);
      setAnswer('');
      setNotice('문제 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void loadQuestion();
  }, [authLoading, chapterNo, examOnly, mode, partNo, preferredStandardId, user?.id]);

  if (authLoading) {
    return <Card>사용자 정보를 확인하는 중...</Card>;
  }

  async function submitAnswer(submittedAnswer: string) {
    if (!user || !current || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitNotice(undefined);

    try {
      const { result: scoring, metadata } = await gradeAnswer({
        title: current.title,
        correctAnswer: current.answer,
        userAnswer: submittedAnswer,
        requiredKeywords: current.required_keywords,
        optionalKeywords: current.optional_keywords,
        wrongConcepts: current.wrong_concepts,
      });

      const outcome = await recordStudyOutcome(user.id, current, submittedAnswer, scoring, mode, metadata);
      setResult(scoring);
      setGradingMetadata(metadata);
      setSubmitNotice(outcome.notice);
    } catch (error) {
      setSubmitNotice(error instanceof Error ? error.message : 'AI채점에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (!current) {
      return;
    }

    setAnswer('');
    await submitAnswer('');
  }

  async function handleManualWrongNote() {
    if (!user || !current) {
      return;
    }

    await manuallyAddWrongNote(user.id, current.id);
  }

  async function handleReportIssue(reportType: 'QUESTION_AMBIGUOUS' | 'ANSWER_INCORRECT' | 'GRADING_INCORRECT', detail?: string) {
    if (!user || !current || !result) {
      return '신고 대상을 찾지 못했습니다.';
    }

    const payload = await submitIssueReport(user.id, current.id, reportType, result.resultStatus, detail);
    return payload.notice;
  }

  if (loading) {
    return <Card>문제를 불러오는 중...</Card>;
  }

  if (!current) {
    return (
      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>{mode === 'WRONG_NOTE' ? '현재 오답노트에 풀 문제가 없습니다.' : '출제 가능한 문제가 없습니다.'}</strong>
        {mode === 'SELECT' ? <Notice>선택한 장의 기준서를 모두 확인했습니다.</Notice> : null}
        <Button onClick={() => navigate('/')} tone="secondary">
          홈으로 돌아가기
        </Button>
      </Card>
    );
  }

  return (
    <Stack>
      {notice ? <Notice>{notice}</Notice> : null}
      {submitNotice ? <Notice>{submitNotice}</Notice> : null}
      <QuestionCard>
        <MetaSection>
          <LocationBlock>
            {getStandardLocationLines(current).map((line, index) => {
              if (index === 0) {
                return <PartLine key={line}>{line}</PartLine>;
              }
              if (index === 1) {
                return <ChapterLine key={line}>{line}</ChapterLine>;
              }
              return <SectionLine key={line}>{line}</SectionLine>;
            })}
          </LocationBlock>
          <TitleRow>
            <LevelBox>{`Lv${current.level}`}</LevelBox>
            <Title>{current.title}</Title>
          </TitleRow>
        </MetaSection>

        <div>
          <Textarea
            id="answer"
            placeholder="답안을 작성하세요."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={Boolean(result) || submitting}
          />
        </div>

        {!result ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <Button onClick={() => void submitAnswer(answer)} disabled={!current || submitting}>
              {submitting ? 'AI채점 중...' : 'AI채점'}
            </Button>
            <Button tone="ghost" onClick={() => void handleSkip()} disabled={submitting}>
              SKIP
            </Button>
            <Button tone="secondary" onClick={() => navigate('/')} disabled={submitting}>
              학습 종료
            </Button>
          </div>
        ) : null}
      </QuestionCard>

      {result ? (
        <ResultPanel
          standard={current}
          userAnswer={answer}
          result={result}
          metadata={gradingMetadata}
          onAddWrongNote={handleManualWrongNote}
          onReportIssue={handleReportIssue}
          onNext={() => void loadQuestion(current.id)}
          onExit={() => navigate('/')}
        />
      ) : null}
    </Stack>
  );
}
