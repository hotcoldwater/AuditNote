import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { RichTextContent } from '../components/RichTextContent';
import { useAuth } from '../lib/auth';
import { fetchExamQuestionsByIds, formatExamText } from '../lib/examQuestions';
import { listAdminIssueReports, updateIssueReportResolved } from '../lib/issueReports';
import { fetchStandardsByIds } from '../lib/standards';
import { getStandardSourceRefText } from '../lib/standardDisplay';
import { styled } from '../styles/stitches.config';
import type { ExamQuestion, IssueReport, Standard } from '../types';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const TabBar = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
});

const Meta = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  alignItems: 'center',
});

const Small = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

type AdminTab = 'STUDY' | 'EXAM';

function reportTypeLabel(reportType: IssueReport['report_type']) {
  switch (reportType) {
    case 'QUESTION_AMBIGUOUS':
      return '문제가 애매함';
    case 'ANSWER_INCORRECT':
      return '답안이 이상함';
    case 'GRADING_INCORRECT':
      return '채점이 이상함';
    default:
      return reportType;
  }
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function AdminNotesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('STUDY');
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [standardsMap, setStandardsMap] = useState<Record<string, Standard>>({});
  const [questionsMap, setQuestionsMap] = useState<Record<string, ExamQuestion>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotice(null);

      try {
        const items = await listAdminIssueReports();
        const studyIds = items.map((item) => item.standard_id).filter((item): item is string => Boolean(item));
        const examIds = items.map((item) => item.question_id).filter((item): item is string => Boolean(item));
        const [standardsPayload, examPayload] = await Promise.all([
          fetchStandardsByIds(studyIds),
          fetchExamQuestionsByIds(examIds),
        ]);

        if (cancelled) {
          return;
        }

        setReports(items);
        setStandardsMap(Object.fromEntries(standardsPayload.standards.map((item) => [item.id, item])));
        setQuestionsMap(Object.fromEntries(examPayload.questions.map((item) => [item.id, item])));
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message.trim() : '';
          setNotice(message ? `관리노트를 불러오는 중 오류가 발생했습니다. (${message})` : '관리노트를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => reports.filter((item) => item.source_kind === tab), [reports, tab]);

  async function handleToggleResolved(reportId: string, nextResolved: boolean) {
    if (!user) {
      return;
    }

    setTogglingId(reportId);
    setNotice(null);

    try {
      await updateIssueReportResolved(reportId, nextResolved, user.id);
      setReports((current) =>
        current.map((item) =>
          item.id === reportId
            ? {
                ...item,
                is_resolved: nextResolved,
                resolved_at: nextResolved ? new Date().toISOString() : null,
                resolved_by: nextResolved ? user.id : null,
              }
            : item,
        ),
      );
    } catch {
      setNotice('수정완료 상태를 저장하지 못했습니다.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Layout title="관리노트">
      <Stack>
        <TabBar>
          <Button tone={tab === 'STUDY' ? 'primary' : 'secondary'} onClick={() => setTab('STUDY')}>
            학습노트 신고오류
          </Button>
          <Button tone={tab === 'EXAM' ? 'primary' : 'secondary'} onClick={() => setTab('EXAM')}>
            기출노트 신고오류
          </Button>
        </TabBar>

        {notice ? <Card>{notice}</Card> : null}
        {loading ? <Card>불러오는 중...</Card> : null}
        {!loading && !notice && filteredReports.length === 0 ? <Card>접수된 신고가 없습니다.</Card> : null}

        {!loading
          ? filteredReports.map((report) => {
              const standard = report.standard_id ? standardsMap[report.standard_id] : null;
              const question = report.question_id ? questionsMap[report.question_id] : null;
              const title =
                report.source_kind === 'STUDY'
                  ? standard?.title ?? report.standard_id ?? '기준서 문제'
                  : question?.section_title ?? question?.chapter_title ?? report.question_id ?? '기출문제';
              const sourceText =
                report.source_kind === 'STUDY'
                  ? (standard ? getStandardSourceRefText(standard) : report.standard_id ?? '-')
                  : [
                      question?.part_title,
                      question?.chapter_title,
                      question?.source_page ? `출처 ${question.source_page}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ');

              return (
                <Card key={report.id} css={{ display: 'grid', gap: '$4' }}>
                  <Meta>
                    <Badge tone={report.is_resolved ? 'success' : 'warning'}>
                      {report.is_resolved ? '수정완료' : '미처리'}
                    </Badge>
                    <Badge tone="primary">{reportTypeLabel(report.report_type)}</Badge>
                    {report.result_status ? <Badge tone="neutral">{report.result_status}</Badge> : null}
                    <Small>{formatCreatedAt(report.created_at)}</Small>
                  </Meta>

                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong>{title}</strong>
                    <Small>{sourceText || '-'}</Small>
                  </div>

                  {report.source_kind === 'STUDY' && standard ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Small>모범답안</Small>
                      <div style={{ lineHeight: 1.8 }}>
                        <RichTextContent value={standard.answer} />
                      </div>
                    </div>
                  ) : null}

                  {report.source_kind === 'EXAM' && question ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Small>문제 내용</Small>
                      <div style={{ lineHeight: 1.8 }}>
                        <RichTextContent value={formatExamText(question.question_text)} />
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gap: 8 }}>
                    <Small>신고 내용</Small>
                    <div style={{ lineHeight: 1.8 }}>
                      <RichTextContent value={report.detail?.trim() || '추가 설명 없음'} />
                    </div>
                  </div>

                  <Button
                    tone={report.is_resolved ? 'secondary' : 'primary'}
                    onClick={() => void handleToggleResolved(report.id, !report.is_resolved)}
                    disabled={togglingId === report.id}
                  >
                    {togglingId === report.id
                      ? '저장 중...'
                      : report.is_resolved
                        ? '수정완료 해제'
                        : '수정완료 체크'}
                  </Button>
                </Card>
              );
            })
          : null}
      </Stack>
    </Layout>
  );
}
