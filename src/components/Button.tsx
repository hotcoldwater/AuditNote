import { styled } from '../styles/stitches.config';

export const Button = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  width: '100%',
  minHeight: '54px',
  padding: '$3 $6',
  borderRadius: '$md',
  fontSize: '$2',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'scale(0.985)',
  },
  '&:focus-visible': {
    boxShadow: '$focus',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
  },
  variants: {
    tone: {
      primary: {
        backgroundColor: '$primaryPanel',
        color: '$panel',
        boxShadow: '0 10px 24px rgba(26, 60, 52, 0.12)',
        '&:hover': {
          backgroundColor: '$primary',
        },
      },
      secondary: {
        backgroundColor: '$surface',
        color: '$text',
        borderColor: '$border',
        boxShadow: '$soft',
        '&:hover': {
          backgroundColor: '$panel',
          borderColor: '$subtleText',
        },
      },
      ghost: {
        backgroundColor: '$surfaceSoft',
        color: '$primary',
        borderColor: '$borderSoft',
        '&:hover': {
          backgroundColor: '$primarySoft',
        },
      },
      danger: {
        backgroundColor: '$danger',
        color: '$panel',
        '&:hover': {
          backgroundColor: '#93000a',
        },
      },
    },
  },
  defaultVariants: {
    tone: 'primary',
  },
});
