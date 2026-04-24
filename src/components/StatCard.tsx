import { Card } from './Card';
import { styled } from '../styles/stitches.config';

const Title = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
});

const Value = styled('div', {
  fontSize: '$6',
  fontWeight: 800,
  lineHeight: 1.1,
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
    <Card css={{ display: 'grid', gap: '$3', padding: '$5' }}>
      <Title>{title}</Title>
      <Value>{value}</Value>
      {description ? <Description>{description}</Description> : null}
    </Card>
  );
}
