import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

async function fetchAll(supabase: any, table: string) {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const to = from + 999;
    const { data, error } = await supabase.from(table).select('*').range(from, to).order('id');
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...data);
    if (data.length < 1000) {
      break;
    }
    from += 1000;
  }

  return rows;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [examQuestions, examAttempts, issueReports] = await Promise.all([
    fetchAll(supabase, 'exam_questions'),
    fetchAll(supabase, 'exam_attempts'),
    fetchAll(supabase, 'issue_reports'),
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups', `exam-db-${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });

  await Promise.all([
    fs.writeFile(path.join(backupDir, 'exam_questions.json'), JSON.stringify(examQuestions, null, 2)),
    fs.writeFile(path.join(backupDir, 'exam_attempts.json'), JSON.stringify(examAttempts, null, 2)),
    fs.writeFile(path.join(backupDir, 'issue_reports.json'), JSON.stringify(issueReports, null, 2)),
  ]);

  console.log(
    JSON.stringify(
      {
        backupDir,
        examQuestions: examQuestions.length,
        examAttempts: examAttempts.length,
        issueReports: issueReports.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
  } else {
    try {
      console.error(JSON.stringify(error, null, 2));
    } catch {
      console.error(error);
    }
  }
  process.exit(1);
});
