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

export function formatAnswerForDisplay(answer: string) {
  let value = answer.replace(/\\n/g, '\n').replace(/\r/g, '');

  value = value.replace(/(?:^|\s)n\/\s*/gi, '\n');
  value = value.replace(/(?:^|[\t ]+)(\d+\))/g, (_match, group, offset) => (offset === 0 ? group : `\n${group}`));
  value = value.replace(
    /(?:^|[\t ]+)([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮㉠㉡㉢㉣㉤㉥㉦㉧])/g,
    (_match, group, offset) => (offset === 0 ? group : `\n${group}`),
  );
  value = value.replace(/\n{3,}/g, '\n\n');

  return value
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}
