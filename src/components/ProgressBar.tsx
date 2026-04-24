import { styled } from '../styles/stitches.config';

const Track = styled('div', {
  width: '100%',
  height: '6px',
  borderRadius: '$pill',
  backgroundColor: '$surfaceStrong',
  overflow: 'hidden',
});

const Fill = styled('div', {
  height: '100%',
  borderRadius: '$pill',
  background: 'linear-gradient(90deg, $secondary 0%, $primaryPanel 100%)',
});

const Row = styled('div', {
  display: 'grid',
  gap: '$2',
});

const LabelRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

export function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <Row>
      <LabelRow>
        <span>{label}</span>
        <strong>{value.toFixed(1)}%</strong>
      </LabelRow>
      <Track>
        <Fill css={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </Track>
    </Row>
  );
}
