import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SessionPlayer } from '../components/SessionPlayer';
import type { StudyMode } from '../types';

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function StudyPlayPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const partNo = parseOptionalNumber(searchParams.get('partNo'));
  const chapterNo = parseOptionalNumber(searchParams.get('chapterNo'));
  const standardId = searchParams.get('standardId');
  const examOnly = searchParams.get('examOnly') === '1';
  const excludeSolved = searchParams.get('excludeSolved') === '1';

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
        partNo={partNo}
        chapterNo={chapterNo}
        preferredStandardId={standardId}
        examOnly={examOnly}
        excludeSolved={excludeSolved}
      />
    </Layout>
  );
}
