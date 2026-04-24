import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type RawRow = Record<string, string>;
type ValidationIssue = { row: number; id: string; message: string };

const FIELD_MAP: Record<string, string> = {
  contentType: 'content_type',
  sourceRef: 'source_ref',
  partNo: 'part_no',
  chapterNo: 'chapter_no',
  sectionNo: 'section_no',
  topicNo: 'topic_no',
  parenNo: 'paren_no',
  bracketNo: 'bracket_no',
  itemNo: 'item_no',
  examYears: 'exam_years',
  requiredKeywords: 'required_keywords',
  optionalKeywords: 'optional_keywords',
  isActive: 'is_active',
  checkStatus: 'check_status',
};

const NUMBER_FIELDS = new Set([
  'partNo',
  'chapterNo',
  'sectionNo',
  'topicNo',
  'parenNo',
  'bracketNo',
  'itemNo',
  'level',
]);

const ARRAY_FIELDS = new Set(['examYears', 'requiredKeywords', 'optionalKeywords', 'tags']);
const REQUIRED_COLUMNS = ['id', 'title', 'answer', 'level'];
const TRUTHY_VALUES = new Set(['true', '1', 'y', 'yes', 'active']);

function usage() {
  console.log('Usage: npm run import:standards data/standards.tsv');
  console.log('       npm run import:standards data/standards.tsv -- --dry-run');
}

function toBoolean(value: string) {
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toArray(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTsv(content: string) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error('TSV 파일이 비어 있습니다.');
  }

  const headers = lines[0].split('\t').map((item) => item.trim());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`필수 컬럼 누락: ${missingColumns.join(', ')}`);
  }

  const rows = lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return headers.reduce<RawRow>((acc, header, index) => {
      acc[header] = cells[index]?.trim() ?? '';
      return acc;
    }, {});
  });

  return { headers, rows };
}

function validateAndTransform(rows: RawRow[]) {
  const seenIds = new Set<string>();
  const invalidRowIndexes = new Set<number>();
  const issues: ValidationIssue[] = [];
  const duplicates: string[] = [];
  const transformed: Record<string, unknown>[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const id = row.id?.trim() ?? '';
    const title = row.title?.trim() ?? '';
    const answer = row.answer?.trim() ?? '';
    const level = row.level?.trim() ?? '';

    if (!id) {
      issues.push({ row: rowNumber, id: '-', message: 'id 누락' });
      invalidRowIndexes.add(index);
    }
    if (!title) {
      issues.push({ row: rowNumber, id: id || '-', message: 'title 누락' });
      invalidRowIndexes.add(index);
    }
    if (!answer) {
      issues.push({ row: rowNumber, id: id || '-', message: 'answer 누락' });
      invalidRowIndexes.add(index);
    }
    if (!level) {
      issues.push({ row: rowNumber, id: id || '-', message: 'level 누락' });
      invalidRowIndexes.add(index);
    }
    if (id && seenIds.has(id)) {
      duplicates.push(id);
      issues.push({ row: rowNumber, id, message: '중복 id' });
      invalidRowIndexes.add(index);
    }
    seenIds.add(id);

    const parsedLevel = toNullableNumber(level);
    if (level && (parsedLevel === null || !Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 5)) {
      issues.push({ row: rowNumber, id: id || '-', message: 'level 오류 (1~5)' });
      invalidRowIndexes.add(index);
    }

    const record: Record<string, unknown> = {};

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const key = FIELD_MAP[rawKey] ?? rawKey.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
      const value = rawValue ?? '';

      if (ARRAY_FIELDS.has(rawKey)) {
        record[key] = toArray(value);
        return;
      }

      if (NUMBER_FIELDS.has(rawKey)) {
        const parsed = toNullableNumber(value);
        if (value.trim() && Number.isNaN(parsed)) {
          issues.push({ row: rowNumber, id: id || '-', message: `${rawKey} 숫자 변환 실패` });
          invalidRowIndexes.add(index);
        }
        record[key] = Number.isNaN(parsed) ? null : parsed;
        return;
      }

      if (rawKey === 'isActive') {
        record[key] = toBoolean(value);
        return;
      }

      if (rawKey === 'checkStatus') {
        record[key] = value.trim() || 'DRAFT';
        return;
      }

      record[key] = value.trim() || null;
    });

    record.id = id;
    record.title = title;
    record.answer = answer;
    record.level = Number.isFinite(parsedLevel) ? parsedLevel : null;
    record.is_active = record.is_active ?? false;
    record.check_status = record.check_status ?? 'DRAFT';

    transformed.push(record);
  });

  return {
    transformed,
    validRows: transformed.filter((_row, index) => !invalidRowIndexes.has(index)),
    issues,
    duplicates: Array.from(new Set(duplicates)),
  };
}

async function main() {
  const [, , fileArg, ...restArgs] = process.argv;
  if (!fileArg) {
    usage();
    process.exit(1);
  }

  const dryRun = restArgs.includes('--dry-run');
  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  const { rows } = parseTsv(fs.readFileSync(filePath, 'utf8'));
  const validation = validateAndTransform(rows);

  const summaryBase = {
    totalRows: rows.length,
    validRows: validation.validRows.length,
    errorRows: validation.issues.length,
    duplicateIds: validation.duplicates.length,
    missingRequired: validation.issues.filter((issue) => issue.message.includes('누락')).length,
    levelErrors: validation.issues.filter((issue) => issue.message.includes('level 오류')).length,
  };

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('검증 결과:', { ...summaryBase, dryRun });
    validation.issues.slice(0, 20).forEach((issue) => {
      console.log(`- row ${issue.row} [${issue.id}] ${issue.message}`);
    });
    throw new Error('VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const validIds = validation.validRows.map((row) => String(row.id));
  let updateCount = 0;
  let insertCount = validation.validRows.length;

  if (validIds.length > 0) {
    const { data: existingRows, error } = await supabase.from('standards').select('id').in('id', validIds);
    if (error) {
      throw error;
    }
    const existingIds = new Set((existingRows ?? []).map((row) => String(row.id)));
    updateCount = validIds.filter((id) => existingIds.has(id)).length;
    insertCount = validIds.length - updateCount;
  }

  console.log('검증 결과:', {
    ...summaryBase,
    toInsert: insertCount,
    toUpdate: updateCount,
    dryRun,
  });
  validation.issues.slice(0, 20).forEach((issue) => {
    console.log(`- row ${issue.row} [${issue.id}] ${issue.message}`);
  });

  if (dryRun) {
    return;
  }

  if (validation.validRows.length === 0) {
    throw new Error('업서트할 유효한 행이 없습니다.');
  }

  const chunkSize = 200;
  for (let index = 0; index < validation.validRows.length; index += chunkSize) {
    const chunk = validation.validRows.slice(index, index + chunkSize);
    const { error } = await supabase.from('standards').upsert(chunk, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  }

  console.log(`완료: ${validation.validRows.length}건 upsert`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
