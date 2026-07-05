import { ChangeEvent } from 'react';
import { filesToAnswerImages } from '../lib/answerImages';
import type { AnswerImage } from '../types';
import { styled } from '../styles/stitches.config';
import { Textarea } from './Textarea';

const Stack = styled('div', {
  display: 'grid',
  gap: '$3',
});

const UploadLabel = styled('label', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fit-content',
  minHeight: '42px',
  padding: '0 14px',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  cursor: 'pointer',
});

const HiddenInput = styled('input', {
  display: 'none',
});

const Helper = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.7,
});

const ImageList = styled('div', {
  display: 'grid',
  gap: '$2',
});

const ImageRow = styled('div', {
  display: 'grid',
  gridTemplateColumns: '84px minmax(0, 1fr) auto',
  gap: '$3',
  alignItems: 'center',
  padding: '$3',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
});

const Preview = styled('img', {
  width: '84px',
  height: '84px',
  objectFit: 'cover',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
});

const RemoveButton = styled('button', {
  all: 'unset',
  cursor: 'pointer',
  color: '$danger',
  fontSize: '$2',
  fontWeight: 700,
});

export function AnswerComposer({
  answer,
  answerImages,
  disabled,
  placeholder = '답안을 작성하세요.',
  onAnswerChange,
  onImagesChange,
}: {
  answer: string;
  answerImages: AnswerImage[];
  disabled?: boolean;
  placeholder?: string;
  onAnswerChange: (value: string) => void;
  onImagesChange: (images: AnswerImage[]) => void;
}) {
  async function handleImageInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const nextImages = await filesToAnswerImages(files);
    if (nextImages.length > 0) {
      onImagesChange([...answerImages, ...nextImages]);
    }

    event.target.value = '';
  }

  return (
    <Stack>
      <Textarea
        id="answer"
        placeholder={placeholder}
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        disabled={disabled}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <UploadLabel>
          사진 업로드
          <HiddenInput type="file" accept="image/*" multiple onChange={handleImageInput} disabled={disabled} />
        </UploadLabel>
        <Helper>텍스트가 있으면 텍스트 답안으로 채점하고, 없으면 사진 답안을 인식합니다.</Helper>
      </div>

      {answerImages.length > 0 ? (
        <ImageList>
          {answerImages.map((image) => (
            <ImageRow key={image.id}>
              <Preview src={image.dataUrl} alt={image.name} />
              <div style={{ display: 'grid', gap: 4 }}>
                <strong style={{ color: 'var(--colors-primary)', fontSize: 14, lineHeight: 1.5 }}>{image.name}</strong>
                <Helper>{answer.trim() ? '현재는 텍스트 답안이 우선 채점됩니다.' : '최종 제출 시 사진 답안을 인식합니다.'}</Helper>
              </div>
              <RemoveButton type="button" onClick={() => onImagesChange(answerImages.filter((item) => item.id !== image.id))}>
                삭제
              </RemoveButton>
            </ImageRow>
          ))}
        </ImageList>
      ) : null}
    </Stack>
  );
}
