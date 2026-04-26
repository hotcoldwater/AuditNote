import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { styled } from '../styles/stitches.config';

const ChoiceGrid = styled('div', {
  display: 'grid',
  gap: '$3',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
});

const ChoiceCard = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gap: '$2',
  minHeight: '120px',
  padding: '$5',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
  boxShadow: '$soft',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: '$border',
    backgroundColor: '$surface',
  },
});

const ChoiceTitle = styled('div', {
  color: '$primary',
  fontWeight: 700,
  fontSize: '$3',
  lineHeight: 1.4,
});

const ChoiceMeta = styled('div', {
  color: '$mutedText',
  fontSize: '$2',
  lineHeight: 1.6,
});

export function WrongNotesPage() {
  const navigate = useNavigate();

  return (
    <Layout title="오답노트">
      <Card css={{ display: 'grid', gap: '$2' }}>
        <strong>오답 유형을 선택합니다.</strong>
      </Card>

      <ChoiceGrid>
        <ChoiceCard onClick={() => navigate('/wrong-notes/haggeut')}>
          <ChoiceTitle>하끝 오답</ChoiceTitle>
          <ChoiceMeta>기존 하끝 오답노트를 확인하고 다시 풉니다.</ChoiceMeta>
        </ChoiceCard>
        <ChoiceCard onClick={() => navigate('/wrong-notes/exam')}>
          <ChoiceTitle>기출 오답</ChoiceTitle>
          <ChoiceMeta>기출노트에서 틀렸던 문제만 다시 확인합니다.</ChoiceMeta>
        </ChoiceCard>
      </ChoiceGrid>
    </Layout>
  );
}
