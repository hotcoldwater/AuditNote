import { styled } from '../styles/stitches.config';

export const Card = styled('section', {
  backgroundColor: '$surface',
  border: '1px solid $borderSoft',
  borderRadius: '$xl',
  boxShadow: '$soft',
  padding: '$6',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0) 40%)',
    pointerEvents: 'none',
  },
});
