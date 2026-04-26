import { useNavigate } from 'react-router-dom';
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
  alignContent: 'center',
  justifyItems: 'center',
  textAlign: 'center',
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
  fontSize: '$5',
  lineHeight: 1.3,
});

export function WrongNotesPage() {
  const navigate = useNavigate();

  return (
    <Layout title="오답노트">
      <ChoiceGrid>
        <ChoiceCard onClick={() => navigate('/wrong-notes/haggeut')}>
          <ChoiceTitle>하끝 오답</ChoiceTitle>
        </ChoiceCard>
        <ChoiceCard onClick={() => navigate('/wrong-notes/exam')}>
          <ChoiceTitle>기출 오답</ChoiceTitle>
        </ChoiceCard>
      </ChoiceGrid>
    </Layout>
  );
}
