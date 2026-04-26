import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { loadLatestExamAttemptMap } from '../lib/examAttempts';
import { useAuth } from '../lib/auth';
import { fetchExamQuestions, formatExamText, getAvailableExamParts, groupQuestionsByChapter } from '../lib/examQuestions';
import { styled } from '../styles/stitches.config';
import type { ExamAttempt, ExamQuestion } from '../types';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Notice = styled(Card, {
  color: '$warning',
  lineHeight: 1.7,
});

const ChoiceGrid = styled('div', {
  display: 'grid',
  gap: '$3',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

const ChoiceCard = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  minHeight: '108px',
  padding: '$5',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
  boxShadow: '$soft',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: '$border',
    backgroundColor: '$surface',
  },
});

const ButtonLabel = styled('div', {
  fontSize: '$3',
  fontWeight: 700,
  color: '$primary',
  lineHeight: 1.3,
});

const HeaderCard = styled(Card, {
  display: 'grid',
  gap: '$3',
});

const HeaderTitle = styled('div', {
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.15,
  color: '$primary',
});

const ActionRow = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
});

const ListCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const ListGrid = styled('div', {
  display: 'grid',
  gap: '$3',
});

const ListButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gap: '$2',
  padding: '$4',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: '$border',
    backgroundColor: '$panel',
  },
});

const RowTop = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
});

const Chip = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '48px',
  minHeight: '28px',
  padding: '0 10px',
  border: '1px solid $border',
  backgroundColor: '$primarySoft',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
});

const HistoryText = styled('div', {
  color: '$danger',
  fontSize: '$1',
  lineHeight: 1.5,
  fontWeight: 700,
  letterSpacing: '0.02em',
});

const ProgressCard = styled(Card, {
  display: 'grid',
  gap: '$5',
  '&::before': {
    display: 'none',
  },
});

const ProgressList = styled('div', {
  display: 'grid',
  gap: '$4',
});

const ProgressRow = styled('div', {
  display: 'grid',
  gap: '$2',
});

const ProgressTop = styled('div', {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '$3',
});

const ProgressName = styled('div', {
  display: 'grid',
  gap: '$1',
});

const ProgressLabel = styled('strong', {
  fontSize: '$3',
  color: '$primary',
  fontWeight: 700,
  lineHeight: 1.45,
});

const ProgressMeta = styled('span', {
  fontSize: '$2',
  color: '$mutedText',
});

const ProgressValue = styled('span', {
  fontSize: '$2',
  color: '$subtleText',
  fontWeight: 700,
});

const Track = styled('div', {
  display: 'flex',
  width: '100%',
  height: '8px',
  borderRadius: '$pill',
  overflow: 'hidden',
  backgroundColor: '$surfaceStrong',
});

const Segment = styled('div', {
  height: '100%',
});

type SetupMode = 'RANDOM' | 'SELECT' | null;

type ChapterGroup = ReturnType<typeof groupQuestionsByChapter>[number];
type ExamProgressItem = {
  key: string;
  label: string;
  title?: string;
  correctRate: number;
  wrongRate: number;
  totalRate: number;
};

function percent(part: number, whole: number) {
  if (!whole) {
    return 0;
  }
  return Number(((part / whole) * 100).toFixed(1));
}

function isSuccess(status: string | null | undefined) {
  return status === 'EXCELLENT' || status === 'CORRECT';
}

function getPartTitle(questions: ExamQuestion[], partNo: number) {
  return questions.find((item) => item.part_no === partNo)?.part_title || `${partNo}편`;
}

function buildExamProgressItems(questions: ExamQuestion[], latestAttemptMap: Map<string, ExamAttempt>) {
  return getAvailableExamParts(questions).map((partNo) => {
    const partQuestions = questions.filter((item) => item.part_no === partNo);
    const total = partQuestions.length;
    let correctCount = 0;
    let wrongCount = 0;

    for (const question of partQuestions) {
      const latest = latestAttemptMap.get(question.id);
      if (!latest) {
        continue;
      }

      if (isSuccess(latest.result_status)) {
        correctCount += 1;
      } else if (latest.result_status !== 'SKIPPED') {
        wrongCount += 1;
      }
    }

    return {
      key: `exam-part-${partNo}`,
      label: `${partNo}편`,
      title: getPartTitle(questions, partNo),
      correctRate: percent(correctCount, total),
      wrongRate: percent(wrongCount, total),
      totalRate: percent(correctCount + wrongCount, total),
    } satisfies ExamProgressItem;
  });
}

export function ExamNotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [selectedPartNo, setSelectedPartNo] = useState<number | null>(null);
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | null>(null);
  const [latestAttemptMap, setLatestAttemptMap] = useState<Map<string, ExamAttempt>>(new Map());

  useEffect(() => {
    let active = true;

    Promise.all([fetchExamQuestions(), user ? loadLatestExamAttemptMap(user.id) : Promise.resolve(new Map())])
      .then(([payload, attemptMap]) => {
        if (!active) {
          return;
        }

        setQuestions(payload.questions);
        setNotice(payload.notice);
        setLatestAttemptMap(attemptMap as Map<string, ExamAttempt>);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setQuestions([]);
        setNotice('기출노트를 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const availableParts = useMemo(() => getAvailableExamParts(questions), [questions]);
  const chapterGroups = useMemo(
    () => (selectedPartNo ? groupQuestionsByChapter(questions.filter((item) => item.part_no === selectedPartNo)) : []),
    [questions, selectedPartNo],
  );
  const currentChapter = useMemo<ChapterGroup | null>(
    () => chapterGroups.find((item) => item.chapterNo === selectedChapterNo) ?? null,
    [chapterGroups, selectedChapterNo],
  );
  const progressItems = useMemo(() => buildExamProgressItems(questions, latestAttemptMap), [questions, latestAttemptMap]);

  return (
    <Layout title="기출노트">
      <Stack>
        {notice ? <Notice>{notice}</Notice> : null}

        <ProgressCard>
          <ProgressList>
            {progressItems.map((item) => (
              <ProgressRow key={item.key}>
                <ProgressTop>
                  <ProgressName>
                    <ProgressLabel>{item.title ? `${item.label}: ${item.title}` : item.label}</ProgressLabel>
                    <ProgressMeta>{loading ? '' : `${item.correctRate.toFixed(1)}% / ${item.wrongRate.toFixed(1)}%`}</ProgressMeta>
                  </ProgressName>
                  <ProgressValue>{loading ? '-' : `${item.totalRate.toFixed(1)}%`}</ProgressValue>
                </ProgressTop>
                <Track>
                  <Segment css={{ width: `${item.correctRate}%`, backgroundColor: '$success' }} />
                  <Segment css={{ width: `${item.wrongRate}%`, backgroundColor: '$danger' }} />
                </Track>
              </ProgressRow>
            ))}
          </ProgressList>

          {!started ? <Button onClick={() => setStarted(true)}>학습 시작</Button> : null}
        </ProgressCard>

        {started && setupMode === null ? (
          <ChoiceGrid>
            <ChoiceCard onClick={() => setSetupMode('RANDOM')}>
              <ButtonLabel>RANDOM</ButtonLabel>
            </ChoiceCard>
            <ChoiceCard onClick={() => setSetupMode('SELECT')}>
              <ButtonLabel>SELECT</ButtonLabel>
            </ChoiceCard>
          </ChoiceGrid>
        ) : null}

        {setupMode === 'RANDOM' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>RANDOM</HeaderTitle>
              <ActionRow>
                <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setSetupMode(null)}>
                  방식 다시 선택
                </Button>
              </ActionRow>
            </HeaderCard>

            <ChoiceGrid>
              {availableParts.map((partNo) => {
                const partQuestions = questions.filter((item) => item.part_no === partNo);
                return (
                  <ChoiceCard key={partNo} onClick={() => navigate(`/exam-notes/play?mode=part&partNo=${partNo}`)}>
                    <ButtonLabel>{`${partNo}편`}</ButtonLabel>
                    {partQuestions.length > 0 ? <HistoryText>{`${partQuestions.length}문제`}</HistoryText> : null}
                  </ChoiceCard>
                );
              })}

              <ChoiceCard onClick={() => navigate('/exam-notes/play?mode=random')}>
                <ButtonLabel>전체</ButtonLabel>
                {!loading ? <HistoryText>{`${questions.length}문제`}</HistoryText> : null}
              </ChoiceCard>
            </ChoiceGrid>
          </Stack>
        ) : null}

        {setupMode === 'SELECT' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>SELECT</HeaderTitle>
              <ActionRow>
                {selectedChapterNo !== null ? (
                  <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setSelectedChapterNo(null)}>
                    장 다시 선택
                  </Button>
                ) : null}
                {selectedPartNo !== null ? (
                  <Button
                    tone="secondary"
                    css={{ width: 'auto', minHeight: '44px' }}
                    onClick={() => {
                      setSelectedPartNo(null);
                      setSelectedChapterNo(null);
                    }}
                  >
                    편 다시 선택
                  </Button>
                ) : null}
                <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setSetupMode(null)}>
                  방식 다시 선택
                </Button>
              </ActionRow>
            </HeaderCard>

            {selectedPartNo === null ? (
              <ChoiceGrid>
                {availableParts.map((partNo) => {
                  const partQuestions = questions.filter((item) => item.part_no === partNo);
                  return (
                    <ChoiceCard key={partNo} onClick={() => setSelectedPartNo(partNo)}>
                      <ButtonLabel>{`${partNo}편`}</ButtonLabel>
                      {partQuestions.length > 0 ? <HistoryText>{`${partQuestions.length}문제`}</HistoryText> : null}
                    </ChoiceCard>
                  );
                })}
              </ChoiceGrid>
            ) : null}

            {selectedPartNo !== null && selectedChapterNo === null ? (
              <ChoiceGrid>
                {chapterGroups.map((chapter) => (
                  <ChoiceCard key={chapter.chapterNo} onClick={() => setSelectedChapterNo(chapter.chapterNo)}>
                    <ButtonLabel>{`${chapter.chapterNo}장`}</ButtonLabel>
                    {chapter.questionCount > 0 ? <HistoryText>{`${chapter.questionCount}문제`}</HistoryText> : null}
                  </ChoiceCard>
                ))}
              </ChoiceGrid>
            ) : null}

            {selectedPartNo !== null && currentChapter ? (
              <ListCard>
                <div style={{ color: '#6f7d90', fontSize: 13 }}>{`${selectedPartNo}편 · ${currentChapter.chapterTitle || `${currentChapter.chapterNo}장`}`}</div>
                <ListGrid>
                  {currentChapter.questions.map((question, index) => {
                    const lastResultStatus = latestAttemptMap.get(question.id)?.result_status;
                    return (
                      <ListButton
                        key={question.id}
                        onClick={() =>
                          navigate(
                            `/exam-notes/play?mode=select&partNo=${selectedPartNo}&chapterNo=${currentChapter.chapterNo}&questionId=${question.id}`,
                          )
                        }
                      >
                        <RowTop>
                          <strong style={{ color: '#173d7a', fontSize: 16, lineHeight: 1.5 }}>
                            {`${index + 1}. ${question.section_title || `문제 ${question.problem_no ?? '-'}`}`}
                          </strong>
                          <Chip>{question.exam_years[0] ? `${question.exam_years[0]}` : `Q${question.problem_no ?? '-'}`}</Chip>
                        </RowTop>
                        {lastResultStatus ? <HistoryText>{`최근 이력 ${lastResultStatus}`}</HistoryText> : null}
                      </ListButton>
                    );
                  })}
                </ListGrid>
              </ListCard>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Layout>
  );
}
