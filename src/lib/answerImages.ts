import type { AnswerImage } from '../types';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('이미지를 읽지 못했습니다.'));
    };
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export function createImageId() {
  return globalThis.crypto?.randomUUID?.() ?? `answer-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function filesToAnswerImages(files: FileList | File[]) {
  const fileArray = Array.from(files);
  const validFiles = fileArray.filter((file) => SUPPORTED_IMAGE_TYPES.has(file.type));

  const images = await Promise.all(
    validFiles.map(async (file) => ({
      id: createImageId(),
      name: file.name,
      dataUrl: await readFileAsDataUrl(file),
      mimeType: file.type,
    })),
  );

  return images satisfies AnswerImage[];
}

export function hasImageAnswer(images: AnswerImage[] | null | undefined) {
  return Array.isArray(images) && images.length > 0;
}

export function summarizeAnswerInput(answer: string, images: AnswerImage[] | null | undefined) {
  const trimmed = answer.trim();
  if (trimmed) {
    return trimmed;
  }
  if (hasImageAnswer(images)) {
    return `사진 답안 ${images!.length}장 제출`;
  }
  return '미응답';
}
