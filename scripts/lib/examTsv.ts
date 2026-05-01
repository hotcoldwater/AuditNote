import fs from 'node:fs';
import path from 'node:path';

export type RawRow = Record<string, string>;

export const EXAM_REQUIRED_COLUMNS = ['id', 'partNo', 'chapterNo', 'questionText', 'answerText'];

export function parseTsvRows(content: string) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === '\t' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseTsv(content: string) {
  const rows = parseTsvRows(content);
  if (rows.length === 0) {
    throw new Error('TSV 파일이 비어 있습니다.');
  }

  const headers = rows[0].map((item) => item.trim());
  return {
    headers,
    rows: rows.slice(1).map((cells) =>
      headers.reduce<RawRow>((acc, header, index) => {
        acc[header] = cells[index]?.trim() ?? '';
        return acc;
      }, {}),
    ),
  };
}

export function collectExamFiles(baseDir = path.resolve(process.cwd(), 'data')) {
  return fs
    .readdirSync(baseDir)
    .filter((file) => /^DoeActualExam_.*\.tsv$/i.test(file))
    .sort()
    .map((file) => path.join(baseDir, file));
}

export function readExamTsvRows() {
  const files = collectExamFiles();

  return files.flatMap((file) => {
    const parsed = parseTsv(fs.readFileSync(file, 'utf8'));
    return parsed.rows.map((row, index) => ({
      source: file,
      rowNumber: index + 2,
      headers: parsed.headers,
      row,
    }));
  });
}

export function normalizeExamText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildExamCompositeKey(input: {
  partNo: string | number | null | undefined;
  chapterNo: string | number | null | undefined;
  sectionNo: string | number | null | undefined;
  problemNo: string | number | null | undefined;
  questionText: string | null | undefined;
}) {
  return [
    String(input.partNo ?? '').trim(),
    String(input.chapterNo ?? '').trim(),
    String(input.sectionNo ?? '').trim(),
    String(input.problemNo ?? '').trim(),
    normalizeExamText(input.questionText),
  ].join('|');
}

export function buildExamLocationKey(input: {
  partNo: string | number | null | undefined;
  chapterNo: string | number | null | undefined;
  sectionNo: string | number | null | undefined;
  problemNo: string | number | null | undefined;
}) {
  return [
    String(input.partNo ?? '').trim(),
    String(input.chapterNo ?? '').trim(),
    String(input.sectionNo ?? '').trim(),
    String(input.problemNo ?? '').trim(),
  ].join('|');
}
