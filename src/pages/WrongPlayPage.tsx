import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';

export function WrongPlayPage() {
  const [searchParams] = useSearchParams();
  const standardId = searchParams.get('standardId');

  return (
    <Layout title="오답 학습" description="오답노트의 unresolved 문제만 다시 풉니다.">
      <SessionPlayer mode="WRONG_NOTE" preferredStandardId={standardId} />
    </Layout>
  );
}
