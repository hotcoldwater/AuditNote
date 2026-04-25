import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';
import type { StudyMode } from '../types';

export function StudyPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const partNo = Number(searchParams.get('partNo'));
  const chapterNo = Number(searchParams.get('chapterNo'));
  const standardId = searchParams.get('standardId');

  const studyMode = useMemo<StudyMode>(() => {
    if (mode === 'part') {
      return 'PART';
    }
    if (mode === 'select') {
      return 'SELECT';
    }
    return 'RANDOM';
  }, [mode]);

  return (
    <Layout title="학습노트">
      <SessionPlayer
        mode={studyMode}
        partNo={Number.isFinite(partNo) ? partNo : undefined}
        chapterNo={Number.isFinite(chapterNo) ? chapterNo : undefined}
        preferredStandardId={standardId}
      />
    </Layout>
  );
}
