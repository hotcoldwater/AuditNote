import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordStudyOutcome, loadUserStandardStatsMap } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { pickRandomWrongStandard, pickWeightedRandomStandard } from '../lib/questionPicker';
import { scoreAnswer } from '../lib/scoring';
import { fetchActiveStandards } from '../lib/standards';
import { manuallyAddWrongNote, listWrongNotes, resolveWrongNote } from '../lib/wrongNotes';
import type { ScoringResult, Standard, StudyMode } from '../types';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { ResultPanel } from './ResultPanel';
import { Textarea } from './Textarea';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$6',
});

const Meta = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const Title = styled('h2', {
  margin: 0,
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.25,
  color: '$primary',
});

const Notice = styled('div', {
  fontSize: '$2',
  color: '$warning',
  lineHeight: 1.6,
});

const QuestionCard = styled(Card, {
  display: 'grid',
  gap: '$6',
});

const MetaSection = styled('section', {
  display: 'grid',
  gap: '$4',
});

const Label = styled('div', {
  color: '$subtleText',
  fontSize: '$2',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 700,
});

function modeLabel(mode: StudyMode, partNo?: number | null) {
  if (mode === 'RANDOM') {
    return '전체 랜덤';
  }
  if (mode === 'PART') {
    return `${partNo}편 학습`;
  }
  return '오답 학습';
}

export function SessionPlayer({
  mode,
  partNo,
  preferredStandardId,
}: {
  mode: StudyMode;
  partNo?: number | null;
  preferredStandardId?: string | null;
}) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | undefined>();
  const [current, setCurrent] = useState<Standard | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [persistenceNotice, setPersistenceNotice] = useState<string | undefined>();

  async function loadQuestion(excludeStandardId?: string | null) {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setResult(null);
    setAnswer('');
    setPersistenceNotice(undefined);

    try {
      if (mode === 'WRONG_NOTE') {
        const [standardsPayload, wrongNotes] = await Promise.all([
          fetchActiveStandards(),
          listWrongNotes(user.id, false),
        ]);

        const wrongIds = new Set(wrongNotes.filter((item) => !item.is_resolved).map((item) => item.standard_id));
        const candidates = standardsPayload.standards.filter((item) => wrongIds.has(item.id));
        setNotice(standardsPayload.notice);
        setCurrent(pickRandomWrongStandard(candidates, preferredStandardId, excludeStandardId));
      } else {
        const standardsPayload = await fetchActiveStandards(mode === 'PART' ? partNo : undefined);
        const statsMap = await loadUserStandardStatsMap(user.id);
        setNotice(standardsPayload.notice);
        setCurrent(pickWeightedRandomStandard(standardsPayload.standards, statsMap, excludeStandardId));
      }
    } catch {
      setCurrent(null);
      setNotice('문제 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void loadQuestion();
  }, [authLoading, mode, partNo, preferredStandardId, user?.id]);

  if (authLoading) {
    return <Card>사용자 정보를 확인하는 중...</Card>;
  }

  async function submitAnswer(submittedAnswer: string) {
    if (!user || !current) {
      return;
    }

    const scoring = scoreAnswer(
      submittedAnswer,
      current.answer,
      current.required_keywords,
      current.optional_keywords,
    );
    const saved = await recordStudyOutcome(user.id, current, submittedAnswer, scoring, mode);
    setResult(scoring);
    setPersistenceNotice(saved.notice);
  }

  async function handleSkip() {
    if (!current) {
      return;
    }

    setAnswer('');
    await submitAnswer('');
  }

  async function handleManualWrongNote() {
    if (!user || !current) {
      return;
    }

    await manuallyAddWrongNote(user.id, current.id);
    setPersistenceNotice((prev) => prev ?? '오답노트에 추가했습니다.');
  }

  async function handleResolveWrongNote() {
    if (!user || !current) {
      return;
    }

    await resolveWrongNote(user.id, current.id);
    setPersistenceNotice('오답노트에서 제거했습니다.');
  }

  if (loading) {
    return <Card>문제를 불러오는 중...</Card>;
  }

  if (!current) {
    return (
      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>{mode === 'WRONG_NOTE' ? '현재 오답노트에 풀 문제가 없습니다.' : '출제 가능한 문제가 없습니다.'}</strong>
        <Button onClick={() => navigate('/')} tone="secondary">
          홈으로 돌아가기
        </Button>
      </Card>
    );
  }

  return (
    <Stack>
      {notice ? <Notice>{notice}</Notice> : null}
      <QuestionCard>
        <Meta>
          <Badge tone="primary">{modeLabel(mode, current.part_no ?? partNo)}</Badge>
          {current.part_no ? <Badge>{current.part_no}편</Badge> : null}
          <Badge>{`Lv${current.level}`}</Badge>
          {current.source_ref ? <Badge>{current.source_ref}</Badge> : null}
        </Meta>

        <MetaSection>
          <Label>기준서 제목</Label>
          <Title>{current.title}</Title>
        </MetaSection>

        <div style={{ display: 'grid', gap: 12 }}>
          <label htmlFor="answer" style={{ fontSize: 13, color: '#717976', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            답안을 직접 작성하세요
          </label>
          <Textarea
            id="answer"
            placeholder="기억나는 문구를 최대한 그대로 적어보세요."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={Boolean(result)}
          />
        </div>

        {!result ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <Button onClick={() => void submitAnswer(answer)} disabled={!current}>
              제출
            </Button>
            <Button tone="ghost" onClick={() => void handleSkip()}>
              모르겠어요
            </Button>
            <Button tone="secondary" onClick={() => navigate('/')}>
              학습 종료
            </Button>
          </div>
        ) : null}
      </QuestionCard>

      {result ? (
        <ResultPanel
          standard={current}
          userAnswer={answer}
          result={result}
          mode={mode}
          persistenceNotice={persistenceNotice}
          onAddWrongNote={handleManualWrongNote}
          onResolveWrongNote={mode === 'WRONG_NOTE' ? handleResolveWrongNote : undefined}
          onNext={() => void loadQuestion(current.id)}
          onExit={() => navigate('/')}
        />
      ) : null}
    </Stack>
  );
}
