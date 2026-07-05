import { createStitches } from '@stitches/react';

export const { styled, css, globalCss, theme } = createStitches({
  theme: {
    colors: {
      background: '#f4faf5',
      panel: '#ffffff',
      surface: '#edf6f0',
      surfaceSoft: '#e4f0e8',
      surfaceStrong: '#d4e6db',
      text: '#173229',
      mutedText: '#4f6b60',
      subtleText: '#6d877b',
      primary: '#1f5b44',
      primarySoft: '#dcefe4',
      primaryPanel: '#2f7a5a',
      secondary: '#5f9f7d',
      secondarySoft: '#cfe4d7',
      accent: '#43755b',
      accentSoft: '#e6f1ea',
      border: '#bed5c7',
      borderSoft: '#dce9e1',
      success: '#2f7a5a',
      successSoft: '#dff1e7',
      warning: '#7b5a19',
      warningSoft: '#f6ead0',
      danger: '#b93a3a',
      dangerSoft: '#ffe1e1',
      shadowColor: 'rgba(25, 63, 49, 0.08)',
    },
    fonts: {
      body:
        '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
      heading:
        '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
      mono: '"SFMono-Regular", Consolas, monospace',
    },
    radii: {
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      pill: '0px',
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
      9: '56px',
    },
    fontSizes: {
      1: '12px',
      2: '13px',
      3: '16px',
      4: '18px',
      5: '28px',
      6: '40px',
    },
    shadows: {
      card: '0 10px 28px rgba(25, 63, 49, 0.06)',
      soft: '0 4px 14px rgba(25, 63, 49, 0.05)',
      focus: '0 0 0 3px rgba(95, 159, 125, 0.22)',
    },
  },
  media: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
  },
});
