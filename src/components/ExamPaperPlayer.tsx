import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradeExamAnswer } from '../lib/examGrading';
import { recordExamAttempt } from '../lib/examAttempts';
import { fetchExamQuestions, formatExamText, getExamQuestionsByYear } from '../lib/examQuestions';
import {
  buildExamPaperOverview,
  clearExamPaperDrafts,
  loadExamPaperDrafts,
  saveExamPaperDraft,
  summarizeDraftAnswer,
  summarizeExamPaperWithAi,
} from '../lib/examPapers';
import { useAuth } from '../lib/auth';
import type { AnswerImage, ExamPaperAnswerDraft, ExamPaperQuestionResult, ExamQuestion } from '../types';
import { AnswerComposer } from './AnswerComposer';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { ExamReviewStatusBadge, ExamReviewTools } from './ExamReviewTools';
import { RichTextContent } from './RichTextContent';
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

const HeaderCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const HeaderTitle = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.2,
  color: '$primary',
});

const HeaderMeta = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.7,
});

const QuestionNav = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const QuestionIndexButton = styled('button', {
  all: 'unset',
  cursor: 'pointer',
  minWidth: '42px',
  minHeight: '42px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  variants: {
    active: {
      true: {
        backgroundColor: '$primarySoft',
        borderColor: '$border',
      },
    },
  },
});

const QuestionCard = styled(Card, {
  display: 'grid',
  gap: '$5',
});

const QuestionTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
  flexWrap: 'wrap',
});

const Title = styled('h3', {
  margin: 0,
  fontSize: '$4',
  lineHeight: 1.5,
  color: '$primary',
});

const Body = styled('div', {
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
  padding: '$5',
  fontSize: '$3',
  lineHeight: 1.9,
  wordBreak: 'keep-all',
});

const ActionRow = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
});

const ResultCard = styled(Card, {
  display: 'grid',
  gap: '$5',
});

const ResultList = styled('div', {
  display: 'grid',
  gap: '$4',
});

const ResultItem = styled('div', {
  display: 'grid',
  gap: '$3',
  padding: '$4',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
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

function detailLines(result: ExamPaperQuestionResult) {
  return [...result.details.missingPoints, ...result.details.wrongPoints].slice(0, 4);
}

export function ExamPaperPlayer({ year }: { year: string }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ExamPaperAnswerDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | undefined>();
  const [results, setResults] = useState<ExamPaperQuestionResult[] | null>(null);
  const [overallSummary, setOverallSummary] = useState<string>('');
  const [overallAdvice, setOverallAdvice] = useState<string>('');

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([fetchExamQuestions(), Promise.resolve(loadExamPaperDrafts(user.id, year))])
      .then(([payload, storedDrafts]) => {
        if (!active) {
          return;
        }
        const yearQuestions = getExamQuestionsByYear(payload.questions, year);
        setQuestions(yearQuestions);
        setDrafts(storedDrafts);
        setNotice(payload.notice);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setQuestions([]);
        setDrafts({});
        setNotice('연도별 기출문제를 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id, year]);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentDraft = currentQuestion
    ? drafts[currentQuestion.id] ?? { questionId: currentQuestion.id, userAnswer: '', answerImages: [] }
    : null;

  function updateDraft(questionId: string, nextDraft: ExamPaperAnswerDraft) {
    setDrafts((current) => {
      const updated = { ...current, [questionId]: nextDraft };
      if (user) {
        saveExamPaperDraft(user.id, year, nextDraft);
      }
      return updated;
    });
  }

  async function submitExamPaper() {
    if (!user || questions.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitNotice(undefined);

    try {
      const nextResults: ExamPaperQuestionResult[] = [];

      for (const [index, question] of questions.entries()) {
        const draft = drafts[question.id] ?? { questionId: question.id, userAnswer: '', answerImages: [] };
        const graded = await gradeExamAnswer({
          questionText: question.question_text,
          correctAnswer: question.answer_text,
          explanationText: question.explanation_text,
          userAnswer: draft.userAnswer,
          answerImages: draft.answerImages,
        });

        await recordExamAttempt(
          user.id,
          question,
          summarizeDraftAnswer(draft.userAnswer, draft.answerImages),
          graded.result,
          graded.metadata,
        );

        nextResults.push({
          questionId: question.id,
          index: index + 1,
          userAnswer: draft.userAnswer,
          answerImages: draft.answerImages,
          scoring: graded.result,
          details: graded.details,
          metadata: graded.metadata,
        });
      }

      const overview = buildExamPaperOverview(year, questions, nextResults);
      const aiSummary = await summarizeExamPaperWithAi({
        year,
        score: overview.score,
        questionResults: nextResults.map((item) => ({
          index: item.index,
          details: item.details,
          scoring: item.scoring,
        })),
      });

      setResults(nextResults);
      setOverallSummary(aiSummary?.summary?.trim() || overview.summary);
      setOverallAdvice(aiSummary?.advice?.trim() || overview.advice);
      clearExamPaperDrafts(user.id, year);
      setSubmitNotice(`총 ${overview.totalCount}문제 중 ${overview.submittedCount}문제를 채점했습니다.`);
    } catch (error) {
      setSubmitNotice(error instanceof Error ? error.message : '연도별 기출 채점에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReviewSaved(question: ExamQuestion) {
    setQuestions((current) => current.map((item) => (item.id === question.id ? { ...item, ...question } : item)));
  }

  if (authLoading) {
    return <Card>사용자 정보를 확인하는 중...</Card>;
  }

  if (loading) {
    return <Card>연도별 기출문제를 불러오는 중...</Card>;
  }

  if (!currentQuestion) {
    return (
      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>선택한 연도의 기출문제가 없습니다.</strong>
        <Notice>현재 업로드된 기출 DB에서 해당 연도로 묶인 문제가 아직 없습니다.</Notice>
        <Button tone="secondary" onClick={() => navigate('/exam-notes')}>
          기출노트로 돌아가기
        </Button>
      </Card>
    );
  }

  const overview = results ? buildExamPaperOverview(year, questions, results) : null;

  return (
    <Stack>
      {notice ? <Notice>{notice}</Notice> : null}
      {submitNotice ? <Notice>{submitNotice}</Notice> : null}

      {!results ? (
        <>
          <HeaderCard>
            <HeaderTitle>{`${year} 기출시험`}</HeaderTitle>
            <HeaderMeta>{`${questions.length}문제 · 이전/다음으로 이동하며 답안을 저장합니다.`}</HeaderMeta>
            <QuestionNav>
              {questions.map((question, index) => {
                const draft = drafts[question.id];
                const hasAnswer = Boolean(draft?.userAnswer?.trim() || draft?.answerImages?.length);
                return (
                  <QuestionIndexButton
                    key={question.id}
                    type="button"
                    active={index === currentIndex}
                    onClick={() => setCurrentIndex(index)}
                    title={hasAnswer ? '답안 작성됨' : '미작성'}
                  >
                    {index + 1}
                  </QuestionIndexButton>
                );
              })}
            </QuestionNav>
          </HeaderCard>

          <QuestionCard>
            <QuestionTitle>
              <Title>{`${currentIndex + 1}번 문제`}</Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <ExamReviewStatusBadge reviewStatus={currentQuestion.review_status} />
                <Badge tone="primary">{`${currentIndex + 1} / ${questions.length}`}</Badge>
              </div>
            </QuestionTitle>

            <Body>
              <RichTextContent value={formatExamText(currentQuestion.question_text)} />
            </Body>

            <ExamReviewTools question={currentQuestion} onSaved={handleReviewSaved} />

            <AnswerComposer
              answer={currentDraft?.userAnswer ?? ''}
              answerImages={currentDraft?.answerImages ?? []}
              onAnswerChange={(value) =>
                updateDraft(currentQuestion.id, {
                  questionId: currentQuestion.id,
                  userAnswer: value,
                  answerImages: currentDraft?.answerImages ?? [],
                })
              }
              onImagesChange={(images) =>
                updateDraft(currentQuestion.id, {
                  questionId: currentQuestion.id,
                  userAnswer: currentDraft?.userAnswer ?? '',
                  answerImages: images,
                })
              }
              disabled={submitting}
              placeholder="문제별 답안을 작성하세요."
            />

            <ActionRow>
              <Button tone="secondary" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0 || submitting}>
                이전
              </Button>
              <Button tone="secondary" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={currentIndex === questions.length - 1 || submitting}>
                다음
              </Button>
              <Button onClick={() => void submitExamPaper()} disabled={submitting}>
                {submitting ? '전체 채점 중...' : '최종 제출'}
              </Button>
              <Button tone="ghost" onClick={() => navigate('/exam-notes')} disabled={submitting}>
                기출노트 종료
              </Button>
            </ActionRow>
          </QuestionCard>
        </>
      ) : null}

      {results && overview ? (
        <ResultCard>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Badge tone={badgeTone(overview.score) as 'success' | 'primary' | 'warning' | 'danger'}>
                {overview.resultStatus}
              </Badge>
              <strong style={{ fontSize: 32, color: 'var(--colors-primary)' }}>{overview.score}점</strong>
            </div>
            <div style={{ color: 'var(--colors-mutedText)', lineHeight: 1.7 }}>{overallSummary}</div>
            {overallAdvice ? <div style={{ color: '#b93a3a', lineHeight: 1.7 }}>{overallAdvice}</div> : null}
          </div>

          <ResultList>
            {results.map((resultItem) => {
              const question = questions.find((item) => item.id === resultItem.questionId);
              if (!question) {
                return null;
              }

              return (
                <ResultItem key={resultItem.questionId}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Badge tone={badgeTone(resultItem.scoring.score) as 'success' | 'primary' | 'warning' | 'danger'}>
                      {resultItem.scoring.resultStatus}
                    </Badge>
                    <strong style={{ color: 'var(--colors-primary)' }}>{`${resultItem.index}번 · ${resultItem.scoring.score}점`}</strong>
                  </div>
                  <div style={{ color: 'var(--colors-mutedText)', lineHeight: 1.7 }}>{resultItem.details.summary}</div>
                  {detailLines(resultItem).length > 0 ? (
                    <div style={{ color: '#b93a3a', lineHeight: 1.7 }}>{detailLines(resultItem).join(' ')}</div>
                  ) : null}
                  <div style={{ display: 'grid', gap: 8 }}>
                    <strong style={{ color: 'var(--colors-primary)' }}>모범답안</strong>
                    <Body>
                      <RichTextContent value={formatExamText(resultItem.details.modelAnswer || question.answer_text)} />
                    </Body>
                  </div>
                  {question.explanation_text ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <strong style={{ color: 'var(--colors-primary)' }}>해설</strong>
                      <Body>
                        <RichTextContent value={formatExamText(question.explanation_text)} />
                      </Body>
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gap: 8 }}>
                    <strong style={{ color: 'var(--colors-primary)' }}>내 답안</strong>
                    <Body>
                      <RichTextContent value={formatExamText(summarizeDraftAnswer(resultItem.userAnswer, resultItem.answerImages))} />
                    </Body>
                  </div>
                </ResultItem>
              );
            })}
          </ResultList>

          <ActionRow>
            <Button onClick={() => navigate('/exam-notes')}>기출노트로 돌아가기</Button>
          </ActionRow>
        </ResultCard>
      ) : null}
    </Stack>
  );
}
