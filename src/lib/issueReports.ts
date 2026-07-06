import type { IssueReport, IssueReportSourceKind, IssueReportType, ResultStatus } from '../types';
import {
  getAllLocalIssueReports,
  getLocalIssueReports,
  isGuestUserId,
  localStoreKeys,
  mergeLocalByUser,
  setLocalIssueReports,
} from './localStore';
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
  sourceKind: IssueReportSourceKind,
  targetId: string,
  reportType: IssueReportType,
  resultStatus: ResultStatus | null,
  detail?: string,
) {
  const payload: IssueReport = {
    id: createId(),
    user_id: userId,
    source_kind: sourceKind,
    standard_id: sourceKind === 'STUDY' ? targetId : null,
    question_id: sourceKind === 'EXAM' ? targetId : null,
    report_type: reportType,
    result_status: resultStatus,
    detail: detail?.trim() || null,
    is_resolved: false,
    resolved_at: null,
    resolved_by: null,
    created_at: new Date().toISOString(),
  };

  if (isGuestUserId(userId)) {
    return { report: payload, notice: '게스트 모드에서는 신고 내용이 저장되지 않습니다.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    mergeLocalByUser(localStoreKeys.ISSUE_REPORTS_KEY, userId, [...getLocalIssueReports(userId), payload]);
    return { report: payload, notice: '신고 내용을 브라우저 로컬에 저장했습니다.' };
  }

  try {
    const { error } = await withTimeout(
      supabase.from('issue_reports').insert({
        user_id: payload.user_id,
        source_kind: payload.source_kind,
        standard_id: payload.standard_id,
        question_id: payload.question_id,
        report_type: payload.report_type,
        result_status: payload.result_status,
        detail: payload.detail,
        is_resolved: payload.is_resolved,
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

function normalizeIssueReport(row: Partial<IssueReport>): IssueReport {
  return {
    id: row.id ?? createId(),
    user_id: row.user_id ?? '',
    source_kind: row.source_kind === 'EXAM' ? 'EXAM' : 'STUDY',
    standard_id: row.standard_id ?? null,
    question_id: row.question_id ?? null,
    report_type: row.report_type ?? 'QUESTION_AMBIGUOUS',
    result_status: row.result_status ?? null,
    detail: row.detail ?? null,
    is_resolved: row.is_resolved ?? false,
    resolved_at: row.resolved_at ?? null,
    resolved_by: row.resolved_by ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function listAdminIssueReports() {
  if (!isSupabaseConfigured || !supabase) {
    return getAllLocalIssueReports()
      .map(normalizeIssueReport)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await withTimeout(
    supabase.from('issue_reports').select('*').order('created_at', { ascending: false }),
    SUPABASE_TIMEOUT_MS,
  );

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => normalizeIssueReport(item as Partial<IssueReport>));
}

export async function updateIssueReportResolved(reportId: string, resolved: boolean, resolvedBy: string) {
  if (!isSupabaseConfigured || !supabase) {
    const nextReports = getAllLocalIssueReports().map((item) =>
      item.id === reportId
        ? {
            ...item,
            is_resolved: resolved,
            resolved_at: resolved ? new Date().toISOString() : null,
            resolved_by: resolved ? resolvedBy : null,
          }
        : item,
    );
    setLocalIssueReports(nextReports);
    return;
  }

  const { error } = await withTimeout(
    supabase
      .from('issue_reports')
      .update({
        is_resolved: resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? resolvedBy : null,
      })
      .eq('id', reportId),
    SUPABASE_TIMEOUT_MS,
  );

  if (error) {
    throw error;
  }
}
