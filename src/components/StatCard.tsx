import { Card } from './Card';
import { styled } from '../styles/stitches.config';

const Title = styled('div', {
  fontSize: '$2',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 700,
});

const Value = styled('div', {
  fontSize: '$5',
  fontFamily: '$heading',
  fontWeight: 600,
  lineHeight: 1.15,
  color: '$primary',
});

const Description = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
});

export function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <Card css={{ display: 'grid', gap: '$3', padding: '$5', backgroundColor: '$surface', minHeight: '150px' }}>
      <Title>{title}</Title>
      <Value>{value}</Value>
      {description ? <Description>{description}</Description> : null}
    </Card>
  );
}
