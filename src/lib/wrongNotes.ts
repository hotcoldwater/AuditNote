import type { WrongNote } from '../types';
import { getLocalWrongNotes, localStoreKeys, mergeLocalByUser } from './localStore';
import { isSupabaseConfigured, supabase } from './supabase';

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `wn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persistLocal(userId: string, notes: WrongNote[]) {
  mergeLocalByUser(localStoreKeys.WRONG_NOTES_KEY, userId, notes);
}

export async function listWrongNotes(userId: string, includeResolved = false): Promise<WrongNote[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalWrongNotes(userId)
      .filter((item) => includeResolved || !item.is_resolved)
      .sort((a, b) => (b.last_attempted_at ?? '').localeCompare(a.last_attempted_at ?? ''));
  }

  try {
    let query = supabase.from('wrong_notes').select('*').eq('user_id', userId);
    if (!includeResolved) {
      query = query.eq('is_resolved', false);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as WrongNote[];
  } catch {
    return getLocalWrongNotes(userId)
      .filter((item) => includeResolved || !item.is_resolved)
      .sort((a, b) => (b.last_attempted_at ?? '').localeCompare(a.last_attempted_at ?? ''));
  }
}

export async function upsertWrongNote(
  userId: string,
  standardId: string,
  source: 'AUTO' | 'MANUAL',
  reason?: string,
) {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalWrongNotes(userId);
    const existing = current.find((item) => item.standard_id === standardId);
    const next: WrongNote = existing
      ? {
          ...existing,
          source,
          reason: reason ?? existing.reason,
          is_resolved: false,
          wrong_count: existing.wrong_count + (source === 'AUTO' ? 1 : 0),
          last_attempted_at: now,
          updated_at: now,
        }
      : {
          id: createId(),
          user_id: userId,
          standard_id: standardId,
          source,
          reason: reason ?? null,
          is_resolved: false,
          wrong_count: 1,
          last_attempted_at: now,
          created_at: now,
          updated_at: now,
        };

    persistLocal(
      userId,
      [...current.filter((item) => item.standard_id !== standardId), next].sort((a, b) =>
        (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
      ),
    );
    return next;
  }

  try {
    const { data: existing } = await supabase
      .from('wrong_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('standard_id', standardId)
      .maybeSingle();

    const payload = existing
      ? {
          ...existing,
          source,
          reason: reason ?? existing.reason,
          is_resolved: false,
          wrong_count: existing.wrong_count + (source === 'AUTO' ? 1 : 0),
          last_attempted_at: now,
          updated_at: now,
        }
      : {
          user_id: userId,
          standard_id: standardId,
          source,
          reason: reason ?? null,
          is_resolved: false,
          wrong_count: 1,
          last_attempted_at: now,
        };

    const { data, error } = await supabase
      .from('wrong_notes')
      .upsert(payload, { onConflict: 'user_id,standard_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as WrongNote;
  } catch {
    const current = getLocalWrongNotes(userId);
    const existing = current.find((item) => item.standard_id === standardId);
    const next: WrongNote = existing
      ? {
          ...existing,
          source,
          reason: reason ?? existing.reason,
          is_resolved: false,
          wrong_count: existing.wrong_count + (source === 'AUTO' ? 1 : 0),
          last_attempted_at: now,
          updated_at: now,
        }
      : {
          id: createId(),
          user_id: userId,
          standard_id: standardId,
          source,
          reason: reason ?? null,
          is_resolved: false,
          wrong_count: 1,
          last_attempted_at: now,
          created_at: now,
          updated_at: now,
        };

    persistLocal(userId, [...current.filter((item) => item.standard_id !== standardId), next]);
    return next;
  }
}

export async function resolveWrongNote(userId: string, standardId: string) {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    const next = getLocalWrongNotes(userId).map((item) =>
      item.standard_id === standardId ? { ...item, is_resolved: true, updated_at: now } : item,
    );
    persistLocal(userId, next);
    return;
  }

  try {
    const { error } = await supabase
      .from('wrong_notes')
      .update({ is_resolved: true, updated_at: now })
      .eq('user_id', userId)
      .eq('standard_id', standardId);

    if (error) {
      throw error;
    }
  } catch {
    const next = getLocalWrongNotes(userId).map((item) =>
      item.standard_id === standardId ? { ...item, is_resolved: true, updated_at: now } : item,
    );
    persistLocal(userId, next);
  }
}

export async function manuallyAddWrongNote(userId: string, standardId: string) {
  return upsertWrongNote(userId, standardId, 'MANUAL', '사용자 수동 추가');
}
