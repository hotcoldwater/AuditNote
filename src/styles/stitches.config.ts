import { createStitches } from '@stitches/react';

export const { styled, css, globalCss, theme } = createStitches({
  theme: {
    colors: {
      background: '#F8F5EF',
      panel: '#FFFFFF',
      text: '#222222',
      mutedText: '#777777',
      primary: '#2F5D50',
      primarySoft: '#DCE8E2',
      danger: '#C0392B',
      warning: '#B7791F',
      success: '#2F855A',
      border: '#E5E0D8',
      accent: '#A8683A',
      surface: '#F2EEE5',
    },
    fonts: {
      body: '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
      heading: '"MaruBuri", "Pretendard", serif',
      mono: '"SFMono-Regular", Consolas, monospace',
    },
    radii: {
      sm: '12px',
      md: '18px',
      lg: '24px',
      pill: '9999px',
    },
    space: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '32px',
      8: '40px',
    },
    fontSizes: {
      1: '12px',
      2: '14px',
      3: '16px',
      4: '18px',
      5: '22px',
      6: '28px',
    },
    shadows: {
      card: '0 12px 32px rgba(34, 34, 34, 0.08)',
    },
  },
  media: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
  },
});
