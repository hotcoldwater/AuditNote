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
  gap: '$2',
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

const ButtonTitle = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.6,
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

const HeaderBody = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.7,
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

type SetupMode = 'RANDOM' | 'SELECT' | null;

type ChapterGroup = ReturnType<typeof groupQuestionsByChapter>[number];

function getPartTitle(questions: ExamQuestion[], partNo: number) {
  return questions.find((item) => item.part_no === partNo)?.part_title || `${partNo}편`;
}

export function ExamNotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
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

  return (
    <Layout title="기출노트">
      <Stack>
        {notice ? <Notice>{notice}</Notice> : null}

        {setupMode === null ? (
          <ChoiceGrid>
            <ChoiceCard onClick={() => setSetupMode('RANDOM')}>
              <ButtonLabel>RANDOM</ButtonLabel>
              <ButtonTitle>선택한 범위 안에서 랜덤으로 기출문제를 출제합니다.</ButtonTitle>
            </ChoiceCard>
            <ChoiceCard onClick={() => setSetupMode('SELECT')}>
              <ButtonLabel>SELECT</ButtonLabel>
              <ButtonTitle>편과 장을 고른 뒤 문제를 순서대로 직접 선택합니다.</ButtonTitle>
            </ChoiceCard>
          </ChoiceGrid>
        ) : null}

        {setupMode === 'RANDOM' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>RANDOM</HeaderTitle>
              <HeaderBody>범위를 고르면 그 안에서 랜덤으로 기출문제를 출제합니다.</HeaderBody>
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
                    <ButtonTitle>{`${getPartTitle(questions, partNo)} · ${partQuestions.length}문제`}</ButtonTitle>
                  </ChoiceCard>
                );
              })}

              <ChoiceCard onClick={() => navigate('/exam-notes/play?mode=random')}>
                <ButtonLabel>전체</ButtonLabel>
                <ButtonTitle>{loading ? '불러오는 중...' : `${questions.length}문제 랜덤`}</ButtonTitle>
              </ChoiceCard>
            </ChoiceGrid>
          </Stack>
        ) : null}

        {setupMode === 'SELECT' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>SELECT</HeaderTitle>
              <HeaderBody>편을 고르고, 장을 고른 뒤, 문제를 순서대로 직접 선택해서 풉니다.</HeaderBody>
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
                      <ButtonTitle>{`${getPartTitle(questions, partNo)} · ${partQuestions.length}문제`}</ButtonTitle>
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
                    <ButtonTitle>{`${chapter.chapterTitle || `${chapter.chapterNo}장`} · ${chapter.questionCount}문제`}</ButtonTitle>
                  </ChoiceCard>
                ))}
              </ChoiceGrid>
            ) : null}

            {selectedPartNo !== null && currentChapter ? (
              <ListCard>
                <HeaderBody>{`${selectedPartNo}편 · ${currentChapter.chapterTitle || `${currentChapter.chapterNo}장`}`}</HeaderBody>
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
                        <ButtonTitle>{formatExamText(question.question_text).slice(0, 90)}...</ButtonTitle>
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
