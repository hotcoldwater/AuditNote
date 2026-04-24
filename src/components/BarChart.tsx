import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$3',
});

const Row = styled('div', {
  display: 'grid',
  gap: '$2',
});

const RowHead = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '$3',
});

const Label = styled('span', {
  fontSize: '$2',
  color: '$mutedText',
});

const Value = styled('strong', {
  fontSize: '$2',
  color: '$primary',
});

const Track = styled('div', {
  height: '10px',
  borderRadius: '$pill',
  backgroundColor: '$surfaceSoft',
  overflow: 'hidden',
});

const Fill = styled('div', {
  height: '100%',
  borderRadius: '$pill',
  background: 'linear-gradient(90deg, $secondary 0%, $primaryPanel 100%)',
});

export function BarChart({
  data,
}: {
  data: Array<{ label: string; value: number; displayValue?: string }>;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <Stack>
      {data.map((item) => (
        <Row key={item.label}>
          <RowHead>
            <Label>{item.label}</Label>
            <Value>{item.displayValue ?? item.value}</Value>
          </RowHead>
          <Track>
            <Fill css={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%` }} />
          </Track>
        </Row>
      ))}
    </Stack>
  );
}
