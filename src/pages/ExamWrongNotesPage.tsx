import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { listLatestExamWrongAttempts } from '../lib/examAttempts';
import { useAuth } from '../lib/auth';
import { fetchExamQuestions } from '../lib/examQuestions';
import type { ExamQuestion } from '../types';

const FILTERS = [
  { key: 'ALL', label: 'ALL' },
  { key: 'WRONG', label: 'WRONG' },
  { key: 'REVIEW', label: 'REVIEW' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export function ExamWrongNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [items, setItems] = useState<Array<{ latestAttempt: any; wrongCount: number }>>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [startOpen, setStartOpen] = useState(false);

  async function load() {
    if (!user) {
      return;
    }

    const [payload, wrongItems] = await Promise.all([fetchExamQuestions(), listLatestExamWrongAttempts(user.id)]);
    setQuestions(payload.questions);
    setItems(wrongItems);
    setNotice(payload.notice);
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const questionMap = useMemo(() => new Map(questions.map((item) => [item.id, item])), [questions]);
  const filteredItems = useMemo(
    () => items.filter((item) => filter === 'ALL' || item.latestAttempt.result_status === filter),
    [filter, items],
  );
  const wrongCount = items.filter((item) => item.latestAttempt.result_status === 'WRONG').length;
  const reviewCount = items.filter((item) => item.latestAttempt.result_status === 'REVIEW').length;
  const allCount = items.length;

  return (
    <Layout title="기출 오답">
      {notice ? <Card css={{ color: '$warning' }}>{notice}</Card> : null}

      <Card css={{ display: 'grid', gap: '$4' }}>
        <strong>오답 시작</strong>
        <Button tone="secondary" onClick={() => setStartOpen((prev) => !prev)}>
          오답 시작
        </Button>
        {startOpen ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <Button tone="secondary" onClick={() => navigate('/wrong/exam/play?scope=wrong')}>
              {`WRONG ${wrongCount}`}
            </Button>
            <Button tone="secondary" onClick={() => navigate('/wrong/exam/play?scope=review')}>
              {`REVIEW ${reviewCount}`}
            </Button>
            <Button tone="secondary" onClick={() => navigate('/wrong/exam/play?scope=all')}>
              {`ALL ${allCount}`}
            </Button>
          </div>
        ) : null}
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((item) => {
          const count = item.key === 'ALL' ? allCount : item.key === 'WRONG' ? wrongCount : reviewCount;
          return (
            <Button
              key={item.key}
              tone={filter === item.key ? 'primary' : 'secondary'}
              css={{ width: 'auto', minHeight: '44px', padding: '0 18px' }}
              onClick={() => setFilter(item.key)}
            >
              {`${item.label} ${count}`}
            </Button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredItems.length === 0 ? (
          <Card>현재 선택한 분류에 기출 오답이 없습니다.</Card>
        ) : (
          filteredItems.map((item) => {
            const question = questionMap.get(item.latestAttempt.question_id);
            return (
              <Card key={item.latestAttempt.question_id} css={{ display: 'grid', gap: '$4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong>{question?.section_title ?? question?.question_text ?? item.latestAttempt.question_id}</strong>
                    <div style={{ color: '#777777', fontSize: 14 }}>
                      {item.wrongCount}회 틀림 · 최근 {item.latestAttempt.created_at.slice(0, 10)}
                    </div>
                  </div>
                  <Badge tone={item.latestAttempt.result_status === 'WRONG' ? 'danger' : 'warning'}>
                    {item.latestAttempt.result_status}
                  </Badge>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <Button
                    tone="secondary"
                    onClick={() =>
                      navigate(`/wrong/exam/play?questionId=${item.latestAttempt.question_id}&scope=${String(item.latestAttempt.result_status).toLowerCase()}`)
                    }
                  >
                    해당 문제 다시 풀기
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
