import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExamSessionPlayer } from '../components/ExamSessionPlayer';
import { Layout } from '../components/Layout';

export function ExamPlayPage() {
  const [searchParams] = useSearchParams();
  const partNo = Number(searchParams.get('partNo'));
  const chapterNo = Number(searchParams.get('chapterNo'));
  const questionId = searchParams.get('questionId');

  const safePartNo = useMemo(() => (Number.isFinite(partNo) ? partNo : 1), [partNo]);
  const safeChapterNo = useMemo(() => (Number.isFinite(chapterNo) ? chapterNo : undefined), [chapterNo]);

  return (
    <Layout title="기출노트">
      <ExamSessionPlayer
        partNo={safePartNo}
        chapterNo={safeChapterNo}
        preferredQuestionId={questionId}
      />
    </Layout>
  );
}
