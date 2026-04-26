import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradeExamAnswer } from '../lib/examGrading';
import { listLatestExamWrongAttempts, loadLatestExamAttemptMap, recordExamAttempt } from '../lib/examAttempts';
import { fetchExamQuestions, formatExamText } from '../lib/examQuestions';
import { useAuth } from '../lib/auth';
import type { ExamAttempt, ExamGradingPayload, ExamQuestion, GradingMetadata, ScoringResult } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { ExamResultPanel } from './ExamResultPanel';
import { RichTextContent } from './RichTextContent';
import { Textarea } from './Textarea';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$6',
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

const MetaBlock = styled('div', {
  display: 'grid',
  gap: '$2',
  padding: '$5',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
});

const PartLine = styled('div', {
  color: '$primary',
  fontSize: '$4',
  lineHeight: 1.3,
  fontWeight: 700,
});

const ChapterLine = styled('div', {
  color: '$accent',
  fontSize: '$3',
  lineHeight: 1.4,
  fontWeight: 700,
});

const SectionLine = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.6,
  fontWeight: 700,
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
});

const HistoryBadge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '30px',
  padding: '0 10px',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  color: '$mutedText',
  fontSize: '$2',
  fontWeight: 700,
});

const Title = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$4',
  lineHeight: 1.5,
  color: '$primary',
});

const QuestionBody = styled('div', {
  backgroundColor: '$panel',
  border: '1px solid $borderSoft',
  padding: '$5',
  color: '$text',
  fontSize: '$3',
  lineHeight: 1.9,
  wordBreak: 'keep-all',
});

function pickSequentialQuestion(
  questions: ExamQuestion[],
  preferredQuestionId?: string | null,
  excludeQuestionId?: string | null,
) {
  if (questions.length === 0) {
    return null;
  }

  if (excludeQuestionId) {
    const currentIndex = questions.findIndex((item) => item.id === excludeQuestionId);
    if (currentIndex >= 0) {
      return questions[currentIndex + 1] ?? null;
    }
  }

  if (preferredQuestionId) {
    const preferred = questions.find((item) => item.id === preferredQuestionId);
    if (preferred) {
      return preferred;
    }
  }

  return questions[0] ?? null;
}

function pickRandomQuestion(questions: ExamQuestion[], preferredQuestionId?: string | null, excludeQuestionId?: string | null) {
  if (questions.length === 0) {
    return null;
  }

  if (preferredQuestionId) {
    const preferred = questions.find((item) => item.id === preferredQuestionId);
    if (preferred) {
      return preferred;
    }
  }

  const pool = excludeQuestionId ? questions.filter((item) => item.id !== excludeQuestionId) : questions;
  if (pool.length === 0) {
    return questions[0] ?? null;
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? pool[0] ?? null;
}

function buildLocationLines(question: ExamQuestion) {
  return [
    `${question.part_no}편: ${question.part_title || `${question.part_no}편`}`,
    `${question.chapter_no}장: ${question.chapter_title || `${question.chapter_no}장`}`,
    question.section_title ? `${question.section_no ?? ''}절: ${question.section_title}` : null,
  ].filter(Boolean) as string[];
}

export function ExamSessionPlayer({
  mode,
  partNo,
  chapterNo,
  preferredQuestionId,
  excludeSolved,
  wrongStatuses,
}: {
  mode?: 'RANDOM' | 'SELECT' | 'WRONG_NOTE';
  partNo?: number | null;
  chapterNo?: number | null;
  preferredQuestionId?: string | null;
  excludeSolved?: boolean;
  wrongStatuses?: Array<'WRONG' | 'REVIEW'>;
}) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | undefined>();
  const [submitNotice, setSubmitNotice] = useState<string | undefined>();
  const [current, setCurrent] = useState<ExamQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [details, setDetails] = useState<ExamGradingPayload | null>(null);
  const [gradingMetadata, setGradingMetadata] = useState<GradingMetadata | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<ExamAttempt | null>(null);

  const locationLines = useMemo(() => (current ? buildLocationLines(current) : []), [current]);

  async function loadQuestion(excludeQuestionId?: string | null) {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setResult(null);
    setDetails(null);
    setGradingMetadata(null);
    setAnswer('');
    setSubmitNotice(undefined);
    setLatestAttempt(null);

    try {
      const [questionsPayload, latestAttemptMap] = await Promise.all([fetchExamQuestions(partNo, chapterNo), loadLatestExamAttemptMap(user.id)]);
      let nextQuestion: ExamQuestion | null = null;
      const solvedQuestionIds = new Set(
        [...latestAttemptMap.entries()]
          .filter(([, attempt]) => attempt.result_status === 'CORRECT' || attempt.result_status === 'EXCELLENT')
          .map(([questionId]) => questionId),
      );
      const baseQuestions =
        excludeSolved && mode !== 'SELECT'
          ? questionsPayload.questions.filter((item) => !solvedQuestionIds.has(item.id))
          : questionsPayload.questions;

      if (mode === 'WRONG_NOTE') {
        const wrongItems = await listLatestExamWrongAttempts(user.id, wrongStatuses);
        const wrongIds = new Set(wrongItems.map((item) => item.latestAttempt.question_id));
        const candidates = baseQuestions.filter((item) => wrongIds.has(item.id));
        nextQuestion = pickRandomQuestion(candidates, preferredQuestionId, excludeQuestionId);
      } else if (mode === 'SELECT') {
        nextQuestion = pickSequentialQuestion(questionsPayload.questions, preferredQuestionId, excludeQuestionId);
      } else {
        nextQuestion = pickRandomQuestion(baseQuestions, preferredQuestionId, excludeQuestionId);
      }

      setNotice(questionsPayload.notice);
      setCurrent(nextQuestion);
      setLatestAttempt(nextQuestion ? latestAttemptMap.get(nextQuestion.id) ?? null : null);
    } catch {
      setCurrent(null);
      setNotice('기출문제를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void loadQuestion();
  }, [authLoading, chapterNo, mode, partNo, preferredQuestionId, user?.id]);

  async function submitAnswer(submittedAnswer: string) {
    if (!user || !current || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitNotice(undefined);

    try {
      const payload = await gradeExamAnswer({
        questionText: current.question_text,
        correctAnswer: current.answer_text,
        explanationText: current.explanation_text,
        userAnswer: submittedAnswer,
      });

      const outcome = await recordExamAttempt(user.id, current, submittedAnswer, payload.result, payload.metadata);
      setResult(payload.result);
      setDetails(payload.details);
      setGradingMetadata(payload.metadata);
      setSubmitNotice(outcome.notice);
      if (payload.result.resultStatus !== 'SKIPPED') {
        setLatestAttempt({
          id: outcome.attempt?.id ?? 'local',
          user_id: user.id,
          question_id: current.id,
          user_answer: submittedAnswer,
          score: payload.result.score,
          result_status: payload.result.resultStatus,
          grading_method: payload.metadata.gradingMethod,
          grading_model: payload.metadata.gradingModel,
          ai_summary: payload.result.reason,
          raw_grading_result: payload.metadata.rawGradingResult,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      setSubmitNotice(error instanceof Error ? error.message : '기출문제 채점에 실패했습니다. 잠시 후 다시 시도해 주세요.');
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

  if (authLoading) {
    return <Card>사용자 정보를 확인하는 중...</Card>;
  }

  if (loading) {
    return <Card>기출문제를 불러오는 중...</Card>;
  }

  if (!current) {
    return (
      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>{mode === 'WRONG_NOTE' ? '현재 기출 오답에 풀 문제가 없습니다.' : '출제 가능한 기출문제가 없습니다.'}</strong>
        <Notice>{mode === 'WRONG_NOTE' ? '최근 기출 오답이 없거나 모두 다시 확인했습니다.' : '선택한 범위의 문제를 모두 확인했습니다.'}</Notice>
        <Button onClick={() => navigate(mode === 'WRONG_NOTE' ? '/wrong-notes/exam' : '/exam-notes')} tone="secondary">
          {mode === 'WRONG_NOTE' ? '기출 오답으로 돌아가기' : '기출노트로 돌아가기'}
        </Button>
      </Card>
    );
  }

  return (
    <Stack>
      {notice ? <Notice>{notice}</Notice> : null}
      {submitNotice ? <Notice>{submitNotice}</Notice> : null}

      <QuestionCard>
        <MetaBlock>
          {locationLines.map((line, index) => {
            if (index === 0) {
              return <PartLine key={line}>{line}</PartLine>;
            }
            if (index === 1) {
              return <ChapterLine key={line}>{line}</ChapterLine>;
            }
            return <SectionLine key={line}>{line}</SectionLine>;
          })}
        </MetaBlock>

        <TitleRow>
          <LevelBox>{`문제 ${current.problem_no ?? '-'}`}</LevelBox>
          <Title>{current.section_title || '기출문제'}</Title>
          {latestAttempt?.result_status ? <HistoryBadge>{latestAttempt.result_status}</HistoryBadge> : null}
        </TitleRow>

        <QuestionBody>
          <RichTextContent value={formatExamText(current.question_text)} />
        </QuestionBody>

        {!result ? (
          <>
            <Textarea
              id="exam-answer"
              placeholder="답안을 작성하세요."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={submitting}
            />

            <div style={{ display: 'grid', gap: 12 }}>
              <Button onClick={() => void submitAnswer(answer)} disabled={submitting}>
                {submitting ? 'AI채점 중...' : 'AI채점'}
              </Button>
              <Button tone="ghost" onClick={() => void handleSkip()} disabled={submitting}>
                SKIP
              </Button>
              <Button tone="secondary" onClick={() => navigate('/exam-notes')} disabled={submitting}>
                기출노트 종료
              </Button>
            </div>
          </>
        ) : null}
      </QuestionCard>

      {result && details ? (
        <ExamResultPanel
          question={current}
          userAnswer={answer}
          result={result}
          details={details}
          metadata={gradingMetadata}
          onNext={() => void loadQuestion(current.id)}
          onExit={() => navigate(mode === 'WRONG_NOTE' ? '/wrong-notes/exam' : '/exam-notes')}
        />
      ) : null}
    </Stack>
  );
}
