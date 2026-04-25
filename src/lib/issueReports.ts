import type { IssueReport, IssueReportType, ResultStatus } from '../types';
import { getLocalIssueReports, localStoreKeys, mergeLocalByUser } from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';

const SUPABASE_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), timeoutMs);
    }),
  ]);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `ir-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function submitIssueReport(
  userId: string,
  standardId: string,
  reportType: IssueReportType,
  resultStatus: ResultStatus | null,
  detail?: string,
) {
  const payload: IssueReport = {
    id: createId(),
    user_id: userId,
    standard_id: standardId,
    report_type: reportType,
    result_status: resultStatus,
    detail: detail?.trim() || null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    mergeLocalByUser(localStoreKeys.ISSUE_REPORTS_KEY, userId, [...getLocalIssueReports(userId), payload]);
    return { report: payload, notice: '신고 내용을 브라우저 로컬에 저장했습니다.' };
  }

  try {
    const { error } = await withTimeout(
      supabase.from('issue_reports').insert({
        user_id: payload.user_id,
        standard_id: payload.standard_id,
        report_type: payload.report_type,
        result_status: payload.result_status,
        detail: payload.detail,
      }),
      SUPABASE_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }

    return { report: payload, notice: '신고가 접수되었습니다.' };
  } catch {
    mergeLocalByUser(localStoreKeys.ISSUE_REPORTS_KEY, userId, [...getLocalIssueReports(userId), payload]);
    return { report: payload, notice: 'Supabase 저장에 실패하여 신고 내용을 브라우저 로컬에 저장했습니다.' };
  }
}
