import { styled } from '../styles/stitches.config';

export const Textarea = styled('textarea', {
  width: '100%',
  minHeight: '220px',
  resize: 'vertical',
  border: '1px solid $border',
  borderRadius: '$md',
  padding: '$4',
  backgroundColor: '$surface',
  color: '$text',
  fontSize: '$3',
  lineHeight: 1.7,
  outline: 'none',
  '&:focus': {
    borderColor: '$primary',
    boxShadow: '0 0 0 3px rgba(47, 93, 80, 0.16)',
  },
});
