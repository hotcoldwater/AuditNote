import { globalCss } from './stitches.config';

export const globalStyles = globalCss({
  '@import':
    'url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");',
  '*': {
    boxSizing: 'border-box',
  },
  html: {
    backgroundColor: '$background',
  },
  body: {
    margin: 0,
    background:
      'radial-gradient(circle at top, rgba(168, 104, 58, 0.08), transparent 32%), $background',
    color: '$text',
    fontFamily: '$body',
  },
  a: {
    color: 'inherit',
    textDecoration: 'none',
  },
  button: {
    fontFamily: 'inherit',
  },
  textarea: {
    fontFamily: 'inherit',
  },
  '#root': {
    minHeight: '100vh',
  },
});
