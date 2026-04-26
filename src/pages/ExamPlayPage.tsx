import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExamSessionPlayer } from '../components/ExamSessionPlayer';
import { Layout } from '../components/Layout';

export function ExamPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const partNo = Number(searchParams.get('partNo'));
  const chapterNo = Number(searchParams.get('chapterNo'));
  const questionId = searchParams.get('questionId');

  const safePartNo = useMemo(() => (Number.isFinite(partNo) ? partNo : undefined), [partNo]);
  const safeChapterNo = useMemo(() => (Number.isFinite(chapterNo) ? chapterNo : undefined), [chapterNo]);

  return (
    <Layout title="기출노트">
      <ExamSessionPlayer
        mode={mode === 'select' ? 'SELECT' : mode === 'part' ? 'RANDOM' : 'RANDOM'}
        partNo={safePartNo}
        chapterNo={safeChapterNo}
        preferredQuestionId={questionId}
      />
    </Layout>
  );
}
