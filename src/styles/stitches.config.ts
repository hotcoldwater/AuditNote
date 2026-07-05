import { createStitches } from '@stitches/react';

export const { styled, css, globalCss, theme } = createStitches({
  theme: {
    colors: {
      background: '#f7faff',
      panel: '#ffffff',
      surface: '#f1f6fd',
      surfaceSoft: '#eaf1fb',
      surfaceStrong: '#dbe7f6',
      text: '#10233f',
      mutedText: '#5d7090',
      subtleText: '#7587a2',
      primary: '#173d7a',
      primarySoft: '#dce9ff',
      primaryPanel: '#2457a6',
      secondary: '#4d84d8',
      secondarySoft: '#c8dcff',
      accent: '#315f9f',
      accentSoft: '#e5efff',
      border: '#c5d6eb',
      borderSoft: '#e3ebf7',
      success: '#2457a6',
      successSoft: '#deebff',
      warning: '#7b5a19',
      warningSoft: '#f6ead0',
      danger: '#b93a3a',
      dangerSoft: '#ffe1e1',
      shadowColor: 'rgba(18, 46, 92, 0.08)',
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
      card: '0 10px 28px rgba(18, 46, 92, 0.06)',
      soft: '0 4px 14px rgba(18, 46, 92, 0.05)',
      focus: '0 0 0 3px rgba(77, 132, 216, 0.2)',
    },
  },
  media: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
  },
});
