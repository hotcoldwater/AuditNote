import { globalCss } from './stitches.config';

export const globalStyles = globalCss({
  '*': {
    boxSizing: 'border-box',
  },
  'html, body, #root': {
    minHeight: '100%',
  },
  html: {
    backgroundColor: '$background',
  },
  body: {
    margin: 0,
    background:
      'radial-gradient(circle at top, rgba(197, 234, 223, 0.55), transparent 28%), linear-gradient(180deg, #fdfcf8 0%, $background 24%, #f6f5f2 100%)',
    color: '$text',
    fontFamily: '$body',
    WebkitFontSmoothing: 'antialiased',
    textRendering: 'optimizeLegibility',
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
  input: {
    fontFamily: 'inherit',
  },
  '::selection': {
    backgroundColor: '$primarySoft',
    color: '$primary',
  },
  '.material-symbols-outlined': {
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: '1.25rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '#root': {
    minHeight: '100vh',
  },
});
