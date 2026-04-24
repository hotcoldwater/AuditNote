import { styled } from '../styles/stitches.config';

export const Badge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$2 $3',
  borderRadius: '$pill',
  fontSize: '$2',
  fontWeight: 700,
  variants: {
    tone: {
      neutral: {
        backgroundColor: '$surface',
        color: '$text',
      },
      success: {
        backgroundColor: 'rgba(47, 133, 90, 0.14)',
        color: '$success',
      },
      warning: {
        backgroundColor: 'rgba(183, 121, 31, 0.14)',
        color: '$warning',
      },
      danger: {
        backgroundColor: 'rgba(192, 57, 43, 0.14)',
        color: '$danger',
      },
      primary: {
        backgroundColor: '$primarySoft',
        color: '$primary',
      },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
