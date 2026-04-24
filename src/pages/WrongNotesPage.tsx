import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { fetchActiveStandards } from '../lib/standards';
import { listWrongNotes, resolveWrongNote } from '../lib/wrongNotes';
import type { Standard, WrongNote } from '../types';

export function WrongNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [notice, setNotice] = useState<string | undefined>();

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

  return (
    <Layout title="오답노트" description="자동 등록과 수동 등록 문제를 한곳에서 관리합니다.">
      {notice ? <Card css={{ color: '$warning' }}>{notice}</Card> : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {notes.length === 0 ? (
          <Card>현재 unresolved 오답노트가 없습니다.</Card>
        ) : (
          notes.map((note) => {
            const standard = standardsMap.get(note.standard_id);
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
                  <Badge tone="danger">{note.wrong_count}회</Badge>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <Button tone="secondary" onClick={() => navigate(`/wrong/play?standardId=${note.standard_id}`)}>
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
