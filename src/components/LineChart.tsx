import { styled } from '../styles/stitches.config';

const ChartFrame = styled('div', {
  display: 'grid',
  gap: '$3',
});

const Svg = styled('svg', {
  width: '100%',
  height: '220px',
  overflow: 'visible',
});

const Labels = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '$2',
  fontSize: '$1',
  color: '$subtleText',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export function LineChart({
  data,
}: {
  data: Array<{ label: string; value: number; caption?: string }>;
}) {
  if (data.length === 0) {
    return null;
  }

  const width = 100;
  const height = 100;
  const max = Math.max(...data.map((item) => item.value), 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((item, index) => {
    const x = Number((index * step).toFixed(2));
    const y = Number((height - (item.value / max) * height).toFixed(2));
    return { x, y, value: item.value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width} ${height} L ${points[0]?.x ?? 0} ${height} Z`;

  return (
    <ChartFrame>
      <Svg viewBox={`0 0 ${width} ${height + 10}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="records-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bceddd" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bceddd" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="#e3e2e1"
            strokeDasharray="2 4"
            strokeWidth="0.6"
          />
        ))}
        <path d={areaPath} fill="url(#records-line-fill)" />
        <path d={linePath} fill="none" stroke="#1a3c34" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => (
          <g key={`${point.x}-${point.y}`}>
            <circle cx={point.x} cy={point.y} r="2.7" fill="#faf9f7" stroke="#1a3c34" strokeWidth="1.8" />
          </g>
        ))}
      </Svg>
      <Labels>
        {data.map((item) => (
          <div key={item.label} style={{ display: 'grid', gap: 2 }}>
            <span>{item.label}</span>
            {item.caption ? <strong style={{ color: '#1a3c34', fontSize: 13 }}>{item.caption}</strong> : null}
          </div>
        ))}
      </Labels>
    </ChartFrame>
  );
}
