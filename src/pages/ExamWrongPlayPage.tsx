import { useSearchParams } from 'react-router-dom';
import { ExamSessionPlayer } from '../components/ExamSessionPlayer';
import { Layout } from '../components/Layout';

export function ExamWrongPlayPage() {
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('questionId');
  const scope = searchParams.get('scope');
  const wrongStatuses: Array<'WRONG' | 'REVIEW'> | undefined =
    scope === 'wrong' || scope === 'WRONG' ? ['WRONG'] : scope === 'review' || scope === 'REVIEW' ? ['REVIEW'] : undefined;

  return (
    <Layout title="기출 오답">
      <ExamSessionPlayer mode="WRONG_NOTE" preferredQuestionId={questionId} wrongStatuses={wrongStatuses} />
    </Layout>
  );
}
