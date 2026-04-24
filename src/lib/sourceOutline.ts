import type { Standard } from '../types';
import { getStudyPartTitle } from './partMeta';

export const PRIMARY_SOURCE_FILE = 'source/하끝 20206 회계감사 목차.pdf';

type SourceOutlineEntry = {
  chapter?: string;
  section?: string;
};

const SOURCE_TITLES: Record<string, string> = {
  GENERAL: '하끝 회계감사',
  LAW: '외부감사법',
  STANDARD: '회계감사기준서',
};

const LOCATION_TAG_PATTERN = /^\d+[편장절]$/;

function descriptiveTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter((tag) => tag && !LOCATION_TAG_PATTERN.test(tag));
}

function inferNamesFromTags(standard: Standard): SourceOutlineEntry {
  const tags = descriptiveTags(standard.tags);

  if (tags.length >= 2) {
    return { chapter: tags[0], section: tags[1] };
  }

  if (tags.length === 1) {
    return standard.section_no ? { section: tags[0] } : { chapter: tags[0] };
  }

  return {};
}

export function getOutlineEntry(standard: Standard) {
  const entry = inferNamesFromTags(standard);

  return {
    part: standard.part_no
      ? `${standard.part_no}편${getStudyPartTitle(standard.part_no) ? ` ${getStudyPartTitle(standard.part_no)}` : ''}`
      : '',
    chapter: standard.chapter_no ? `${standard.chapter_no}장${entry.chapter ? ` ${entry.chapter}` : ''}` : '',
    section: standard.section_no ? `${standard.section_no}절${entry.section ? ` ${entry.section}` : ''}` : '',
  };
}

export function getSourceTitle(standard: Standard) {
  const sourceRef = standard.source_ref?.trim();
  if (sourceRef) {
    return sourceRef;
  }

  const contentType = standard.content_type?.trim();
  return contentType ? SOURCE_TITLES[contentType] ?? contentType : '출처 미기재';
}
