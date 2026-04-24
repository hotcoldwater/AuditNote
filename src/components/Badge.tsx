import { styled } from '../styles/stitches.config';

export const Badge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$1',
  minHeight: '30px',
  padding: '$1 $3',
  borderRadius: '$pill',
  fontSize: '$2',
  fontWeight: 700,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  border: '1px solid transparent',
  variants: {
    tone: {
      neutral: {
        backgroundColor: '$panel',
        color: '$text',
        borderColor: '$borderSoft',
      },
      success: {
        backgroundColor: '$successSoft',
        color: '$success',
        borderColor: 'rgba(39, 93, 70, 0.12)',
      },
      warning: {
        backgroundColor: '$warningSoft',
        color: '$warning',
        borderColor: 'rgba(123, 90, 25, 0.12)',
      },
      danger: {
        backgroundColor: '$dangerSoft',
        color: '$danger',
        borderColor: 'rgba(186, 26, 26, 0.12)',
      },
      primary: {
        backgroundColor: '$primarySoft',
        color: '$primary',
        borderColor: 'rgba(1, 38, 31, 0.08)',
      },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
