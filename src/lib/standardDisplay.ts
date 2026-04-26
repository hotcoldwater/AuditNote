import type { Standard } from '../types';
import { getOutlineEntry } from './sourceOutline';

export function getStandardLocationLines(standard: Standard) {
  const lines: string[] = [];
  const outline = getOutlineEntry(standard);

  if (outline.part) {
    lines.push(outline.part);
  }
  if (outline.chapter) {
    lines.push(outline.chapter);
  }
  if (outline.section) {
    lines.push(outline.section);
  }

  return lines;
}

export function getStandardSourceRefText(standard: Standard) {
  return standard.source_ref?.trim() || '출처 미기재';
}

export function formatExamYears(examYears: string[]) {
  return examYears
    .map((year) => year.trim())
    .filter(Boolean)
    .map((year) => year.slice(-2))
    .filter(Boolean)
    .join(', ');
}

function normalizeDisplayText(value: string) {
  let next = value.replace(/\\n/g, '\n').replace(/\r/g, '');

  next = next.replace(/(?:^|\s)n\/\s*/gi, '\n');
  next = next.replace(/(?:^|[\t ]+)(\(\d+\))/g, (_match, group, offset) => (offset === 0 ? group : `\n${group}`));
  next = next.replace(/(?:^|[\t ]+)(\d+\))/g, (_match, group, offset) => (offset === 0 ? group : `\n${group}`));
  next = next.replace(
    /(?:^|[\t ]+)([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮㉠㉡㉢㉣㉤㉥㉦㉧])/g,
    (_match, group, offset) => (offset === 0 ? group : `\n${group}`),
  );
  next = next.replace(/([.다요음함])\s+(결론\s*:|근거\s*:|이유\s*:|판단\s*:)/g, '$1\n$2');
  next = next.replace(/([.다요음함])\s+(\(\d+\))/g, '$1\n$2');
  next = next.replace(/([.다요음함])\s+(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩|㉠|㉡|㉢|㉣|㉤|㉥)/g, '$1\n$2');
  next = next.replace(/\n{3,}/g, '\n\n');

  return next
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function formatAnswerForDisplay(answer: string) {
  return normalizeDisplayText(answer);
}

export function formatDetailedTextForDisplay(value: string) {
  return normalizeDisplayText(value);
}
