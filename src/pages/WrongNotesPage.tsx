import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { fetchActiveStandards } from '../lib/standards';
import { listWrongNotes, resolveWrongNote } from '../lib/wrongNotes';
import type { Standard, WrongNote, WrongNoteStatus } from '../types';

const FILTERS: Array<{ key: 'ALL' | WrongNoteStatus; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'WRONG', label: 'WRONG' },
  { key: 'REVIEW', label: 'REVIEW' },
];

export function WrongNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [filter, setFilter] = useState<'ALL' | WrongNoteStatus>('ALL');

  async function load() {
    if (!user) {
      return;
    }

    const [payload, wrongNotes] = await Promise.all([fetchActiveStandards(), listWrongNotes(user.id, false)]);
    setStandards(payload.standards);
    setNotes(wrongNotes);
    setNotice(payload.notice);
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const standardsMap = useMemo(() => new Map(standards.map((item) => [item.id, item])), [standards]);
  const filteredNotes = useMemo(
    () => notes.filter((item) => filter === 'ALL' || (item.note_status ?? 'WRONG') === filter),
    [filter, notes],
  );
  const wrongCount = notes.filter((item) => (item.note_status ?? 'WRONG') === 'WRONG').length;
  const reviewCount = notes.filter((item) => (item.note_status ?? 'WRONG') === 'REVIEW').length;

  return (
    <Layout title="오답노트" description="WRONG과 REVIEW를 나눠서 보고, 필요한 분류만 다시 풀 수 있습니다.">
      {notice ? <Card css={{ color: '$warning' }}>{notice}</Card> : null}

      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>오답 시작</strong>
        <div style={{ display: 'grid', gap: 12 }}>
          <Button tone="secondary" onClick={() => navigate('/wrong/play?scope=all')}>
            전체 오답 시작
          </Button>
          <Button tone="secondary" onClick={() => navigate('/wrong/play?scope=wrong')}>
            WRONG만 다시 풀기
          </Button>
          <Button tone="secondary" onClick={() => navigate('/wrong/play?scope=review')}>
            REVIEW만 다시 풀기
          </Button>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            tone={filter === item.key ? 'primary' : 'secondary'}
            css={{ width: 'auto', minHeight: '44px', padding: '0 18px' }}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
        <Badge tone="danger">{`WRONG ${wrongCount}`}</Badge>
        <Badge tone="warning">{`REVIEW ${reviewCount}`}</Badge>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredNotes.length === 0 ? (
          <Card>현재 선택한 분류에 unresolved 오답노트가 없습니다.</Card>
        ) : (
          filteredNotes.map((note) => {
            const standard = standardsMap.get(note.standard_id);
            const noteStatus = note.note_status ?? 'WRONG';
            return (
              <Card key={note.id} css={{ display: 'grid', gap: '$4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong>{standard?.title ?? note.standard_id}</strong>
                    <div style={{ color: '#777777', fontSize: 14 }}>
                      {standard?.part_no ?? '-'}편 · Lv{standard?.level ?? '-'} · 마지막 풀이{' '}
                      {note.last_attempted_at ? note.last_attempted_at.slice(0, 10) : '-'}
                    </div>
                  </div>
                  <Badge tone={noteStatus === 'WRONG' ? 'danger' : 'warning'}>{noteStatus}</Badge>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <Button tone="secondary" onClick={() => navigate(`/wrong/play?standardId=${note.standard_id}&scope=${noteStatus.toLowerCase()}`)}>
                    해당 문제 다시 풀기
                  </Button>
                  <Button
                    tone="ghost"
                    onClick={async () => {
                      if (!user) {
                        return;
                      }
                      await resolveWrongNote(user.id, note.standard_id);
                      await load();
                    }}
                  >
                    오답노트에서 제거
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Layout>
  );
}
