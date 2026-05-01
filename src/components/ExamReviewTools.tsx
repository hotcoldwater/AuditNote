import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getExamReviewLabel, updateExamQuestionReview } from '../lib/examQuestions';
import { styled } from '../styles/stitches.config';
import type { ExamQuestion, ExamReviewStatus } from '../types';
import { Button } from './Button';
import { Card } from './Card';

const ReviewBadge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '30px',
  padding: '0 10px',
  border: '1px solid transparent',
  fontSize: '$2',
  fontWeight: 700,
  lineHeight: 1,
  variants: {
    tone: {
      success: {
        backgroundColor: '$successSoft',
        color: '$success',
        borderColor: 'rgba(36, 87, 166, 0.16)',
      },
      danger: {
        backgroundColor: '$dangerSoft',
        color: '$danger',
        borderColor: 'rgba(185, 58, 58, 0.16)',
      },
    },
  },
});

const ReviewPanel = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const ReviewHeading = styled('strong', {
  color: '$primary',
  fontSize: '$3',
  lineHeight: 1.4,
});

const ReviewOptionGrid = styled('div', {
  display: 'grid',
  gap: '$2',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
});

const ReviewOption = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  padding: '$3',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  cursor: 'pointer',
  variants: {
    active: {
      true: {
        borderColor: '$primary',
        backgroundColor: '$primarySoft',
      },
    },
    tone: {
      success: {},
      danger: {},
    },
  },
});

const ReviewNotice = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.6,
});

const ReviewActionRow = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
});

interface ExamReviewToolsProps {
  question: Pick<ExamQuestion, 'id' | 'review_status'>;
  onSaved: (question: ExamQuestion) => void;
}

export function ExamReviewStatusBadge({ reviewStatus }: { reviewStatus: ExamQuestion['review_status'] }) {
  const { user } = useAuth();
  const label = getExamReviewLabel(reviewStatus);

  if (!user?.isAdmin || !label || !reviewStatus) {
    return null;
  }

  return <ReviewBadge tone={reviewStatus === 'VERIFIED' ? 'success' : 'danger'}>{label}</ReviewBadge>;
}

export function ExamReviewTools({ question, onSaved }: ExamReviewToolsProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ExamReviewStatus>(question.review_status ?? 'VERIFIED');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const currentLabel = useMemo(() => getExamReviewLabel(question.review_status), [question.review_status]);

  if (!user?.isAdmin) {
    return null;
  }

  async function handleSubmit() {
    if (submitting || !user?.isAdmin) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const updated = await updateExamQuestionReview(question.id, selectedStatus, user.id);
      onSaved(updated);
      setOpen(false);
      setNotice('검토결과를 저장했습니다.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '검토결과 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Button
        tone="secondary"
        css={{ width: 'fit-content', minHeight: '44px', padding: '0 14px' }}
        onClick={() => {
          setSelectedStatus(question.review_status ?? 'VERIFIED');
          setOpen((current) => !current);
          setNotice(null);
        }}
      >
        검토결과
      </Button>

      {currentLabel && !open ? <ReviewNotice>{`현재 상태: ${currentLabel}`}</ReviewNotice> : null}
      {notice ? <ReviewNotice>{notice}</ReviewNotice> : null}

      {open ? (
        <ReviewPanel>
          <ReviewHeading>관리자 검토결과</ReviewHeading>
          <ReviewOptionGrid>
            <ReviewOption
              type="button"
              active={selectedStatus === 'VERIFIED'}
              tone="success"
              onClick={() => setSelectedStatus('VERIFIED')}
            >
              검증완료
            </ReviewOption>
            <ReviewOption
              type="button"
              active={selectedStatus === 'NEEDS_REVIEW'}
              tone="danger"
              onClick={() => setSelectedStatus('NEEDS_REVIEW')}
            >
              확인필요
            </ReviewOption>
          </ReviewOptionGrid>
          <ReviewActionRow>
            <Button
              css={{ width: 'fit-content', minHeight: '44px', padding: '0 14px' }}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '제출'}
            </Button>
            <Button
              tone="ghost"
              css={{ width: 'fit-content', minHeight: '44px', padding: '0 14px' }}
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              닫기
            </Button>
          </ReviewActionRow>
        </ReviewPanel>
      ) : null}
    </div>
  );
}
