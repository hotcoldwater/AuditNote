import { sampleStandards } from '../data/sampleStandards';
import type { Standard } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const SUPABASE_TIMEOUT_MS = 12000;

export interface StandardsPayload {
  standards: Standard[];
  source: 'supabase' | 'sample';
  notice?: string;
}

function withTimeout(promise: PromiseLike<any>, timeoutMs: number): Promise<any> {
  return Promise.race<any>([
    Promise.resolve(promise),
    new Promise<any>((_, reject) => {
      window.setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), timeoutMs);
    }),
  ]);
}

function normalizeStandard(standard: Partial<Standard>): Standard {
  return {
    id: standard.id ?? '',
    content_type: standard.content_type ?? null,
    source_ref: standard.source_ref ?? null,
    part_no: standard.part_no ?? null,
    chapter_no: standard.chapter_no ?? null,
    section_no: standard.section_no ?? null,
    topic_no: standard.topic_no ?? null,
    paren_no: standard.paren_no ?? null,
    bracket_no: standard.bracket_no ?? null,
    item_no: standard.item_no ?? null,
    title: standard.title ?? '',
    answer: standard.answer ?? '',
    level: standard.level ?? 1,
    exam_years: Array.isArray(standard.exam_years) ? standard.exam_years : [],
    required_keywords: Array.isArray(standard.required_keywords) ? standard.required_keywords : [],
    optional_keywords: Array.isArray(standard.optional_keywords) ? standard.optional_keywords : [],
    tags: Array.isArray(standard.tags) ? standard.tags : [],
    is_active: standard.is_active ?? true,
    check_status: standard.check_status ?? 'DRAFT',
    created_at: standard.created_at,
    updated_at: standard.updated_at,
  };
}

function fallbackStandards(partNo?: number | null): StandardsPayload {
  const filtered = sampleStandards.filter(
    (item) => item.is_active && (typeof partNo !== 'number' || item.part_no === partNo),
  );

  return {
    standards: filtered.map(normalizeStandard),
    source: 'sample',
    notice: 'Supabase standards 데이터가 없어서 샘플 기준서로 표시합니다.',
  };
}

export async function fetchActiveStandards(partNo?: number | null): Promise<StandardsPayload> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackStandards(partNo);
  }

  try {
    let query = supabase.from('standards').select('*').eq('is_active', true);
    if (typeof partNo === 'number') {
      query = query.eq('part_no', partNo);
    }

    const { data, error } = await withTimeout(
      query.order('part_no').order('level').order('title'),
      SUPABASE_TIMEOUT_MS,
    );

    if (error || !data || data.length === 0) {
      return fallbackStandards(partNo);
    }

    return {
      standards: data.map((item: Standard) => normalizeStandard(item)),
      source: 'supabase',
    };
  } catch {
    return {
      ...fallbackStandards(partNo),
      notice: 'Supabase 응답이 지연되어 샘플 기준서로 표시합니다.',
    };
  }
}

export async function fetchStandardsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);

  if (uniqueIds.length === 0) {
    return { standards: [], source: 'sample' as const };
  }

  const payload = await fetchActiveStandards();
  return {
    ...payload,
    standards: payload.standards.filter((item) => uniqueIds.includes(item.id)),
  };
}

export function getAvailableParts(standards: Standard[]) {
  return [...new Set(standards.map((item) => item.part_no).filter((item): item is number => Number.isInteger(item)))]
    .sort((a, b) => a - b);
}
