import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExamSessionPlayer } from '../components/ExamSessionPlayer';
import { Layout } from '../components/Layout';

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ExamPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const partNo = parseOptionalNumber(searchParams.get('partNo'));
  const chapterNo = parseOptionalNumber(searchParams.get('chapterNo'));
  const questionId = searchParams.get('questionId');
  const excludeSolved = searchParams.get('excludeSolved') === '1';

  return (
    <Layout title="기출노트">
      <ExamSessionPlayer
        mode={mode === 'select' ? 'SELECT' : mode === 'part' ? 'RANDOM' : 'RANDOM'}
        partNo={partNo}
        chapterNo={chapterNo}
        preferredQuestionId={questionId}
        excludeSolved={excludeSolved}
      />
    </Layout>
  );
}
