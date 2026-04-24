import { styled } from '../styles/stitches.config';

export const Button = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  width: '100%',
  minHeight: '52px',
  padding: '$3 $5',
  borderRadius: '$pill',
  fontSize: '$3',
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
  },
  variants: {
    tone: {
      primary: {
        backgroundColor: '$primary',
        color: 'white',
      },
      secondary: {
        backgroundColor: '$panel',
        color: '$text',
        borderColor: '$border',
      },
      ghost: {
        backgroundColor: '$primarySoft',
        color: '$primary',
      },
      danger: {
        backgroundColor: '$danger',
        color: 'white',
      },
    },
  },
  defaultVariants: {
    tone: 'primary',
  },
});
