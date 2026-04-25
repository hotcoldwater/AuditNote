import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';

export function WrongPlayPage() {
  const [searchParams] = useSearchParams();
  const standardId = searchParams.get('standardId');
  const scope = searchParams.get('scope');
  const wrongStatuses: Array<'WRONG' | 'REVIEW'> | undefined =
    scope === 'wrong' || scope === 'WRONG' ? ['WRONG'] : scope === 'review' || scope === 'REVIEW' ? ['REVIEW'] : undefined;

  return (
    <Layout title="오답노트">
      <SessionPlayer mode="WRONG_NOTE" preferredStandardId={standardId} wrongStatuses={wrongStatuses} />
    </Layout>
  );
}
