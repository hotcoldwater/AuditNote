import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { getOrderedStudyParts, getStudyPartTitle } from '../lib/partMeta';
import { fetchActiveStandards, getAvailableParts } from '../lib/standards';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Notice = styled(Card, {
  color: '$warning',
  lineHeight: 1.7,
});

const Grid = styled('div', {
  display: 'grid',
  gap: '$3',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

const StudyButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gap: '$2',
  minHeight: '108px',
  padding: '$5',
  borderRadius: '$lg',
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
  '&:focus-visible': {
    boxShadow: '$focus',
  },
  '&:disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
    transform: 'none',
  },
});

const ButtonLabel = styled('div', {
  fontSize: '$3',
  fontWeight: 700,
  color: '$primary',
  lineHeight: 1.3,
});

const ButtonTitle = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.6,
});

export function StudySetupPage() {
  const navigate = useNavigate();
  const [parts, setParts] = useState<number[]>(getOrderedStudyParts());
  const [notice, setNotice] = useState<string | undefined>();

  useEffect(() => {
    fetchActiveStandards().then((payload) => {
      const availableParts = getAvailableParts(payload.standards);
      setParts(availableParts.length > 0 ? availableParts : getOrderedStudyParts());
      setNotice(payload.notice);
    });
  }, []);

  return (
    <Layout title="학습 시작">
      <Stack>
        {notice ? <Notice>{notice}</Notice> : null}

        <Grid>
          {getOrderedStudyParts().map((partNo) => (
            <StudyButton
              key={partNo}
              onClick={() => navigate(`/study/play?mode=part&partNo=${partNo}`)}
              disabled={!parts.includes(partNo)}
            >
              <ButtonLabel>{partNo}편</ButtonLabel>
              <ButtonTitle>{getStudyPartTitle(partNo)}</ButtonTitle>
            </StudyButton>
          ))}

          <StudyButton onClick={() => navigate('/study/play?mode=random')}>
            <ButtonLabel>전체</ButtonLabel>
            <ButtonTitle>전체 범위</ButtonTitle>
          </StudyButton>
        </Grid>
      </Stack>
    </Layout>
  );
}
