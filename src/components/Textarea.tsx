import { styled } from '../styles/stitches.config';

export const Textarea = styled('textarea', {
  width: '100%',
  minHeight: '360px',
  resize: 'vertical',
  border: '1px solid $border',
  borderRadius: '$md',
  padding: '$7',
  backgroundColor: '$panel',
  color: '$text',
  fontSize: '$4',
  lineHeight: 1.85,
  outline: 'none',
  boxShadow: '$soft',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  '&::placeholder': {
    color: '$subtleText',
    fontStyle: 'italic',
  },
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '$focus',
  },
});
