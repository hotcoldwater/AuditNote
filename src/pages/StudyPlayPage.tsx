import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';
import type { StudyMode } from '../types';

export function StudyPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const partNo = Number(searchParams.get('partNo'));

  const studyMode = useMemo<StudyMode>(() => (mode === 'part' ? 'PART' : 'RANDOM'), [mode]);

  return (
    <Layout title="학습 진행" description="제출 즉시 채점하고 같은 조건으로 다음 문제를 이어갑니다.">
      <SessionPlayer mode={studyMode} partNo={Number.isFinite(partNo) ? partNo : undefined} />
    </Layout>
  );
}
