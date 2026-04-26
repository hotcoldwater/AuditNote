import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { fetchExamQuestions, groupQuestionsByChapter } from '../lib/examQuestions';
import { styled } from '../styles/stitches.config';
import type { ExamQuestion } from '../types';

const Stack = styled('div', {
  display: 'grid',
  gap: '$5',
});

const Notice = styled('div', {
  fontSize: '$2',
  color: '$warning',
  lineHeight: 1.7,
});

const IntroCard = styled(Card, {
  display: 'grid',
  gap: '$2',
});

const IntroTitle = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  color: '$primary',
  lineHeight: 1.2,
});

const IntroText = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
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
  minHeight: '120px',
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

const ChoiceTitle = styled('div', {
  color: '$primary',
  fontWeight: 700,
  fontSize: '$3',
  lineHeight: 1.4,
});

const ChoiceMeta = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.6,
});

export function ExamNotesPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchExamQuestions(1)
      .then((payload) => {
        if (!active) {
          return;
        }
        setQuestions(payload.questions);
        setNotice(payload.notice);
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
  }, []);

  const chapters = useMemo(() => groupQuestionsByChapter(questions), [questions]);

  return (
    <Layout title="기출노트">
      <Stack>
        <IntroCard>
          <IntroTitle>1편 기출문제를 실전처럼 풉니다.</IntroTitle>
          <IntroText>문제를 보고 답안을 직접 작성한 뒤 AI 채점으로 총평과 감점요소를 확인합니다.</IntroText>
          {notice ? <Notice>{notice}</Notice> : null}
        </IntroCard>

        <ChoiceGrid>
          <ChoiceCard onClick={() => navigate('/exam-notes/play?partNo=1')}>
            <ChoiceTitle>1편 전체</ChoiceTitle>
            <ChoiceMeta>{loading ? '불러오는 중...' : `${questions.length}문제`}</ChoiceMeta>
          </ChoiceCard>
          {chapters.map((chapter) => (
            <ChoiceCard key={chapter.chapterNo} onClick={() => navigate(`/exam-notes/play?partNo=1&chapterNo=${chapter.chapterNo}`)}>
              <ChoiceTitle>{`${chapter.chapterNo}장 ${chapter.chapterTitle}`}</ChoiceTitle>
              <ChoiceMeta>{`${chapter.questionCount}문제 · ${chapter.sectionCount}개 절`}</ChoiceMeta>
            </ChoiceCard>
          ))}
        </ChoiceGrid>
      </Stack>
    </Layout>
  );
}
