import type { LevelWeightMap, Standard, UserStandardStats } from '../types';

export const levelWeightMap: LevelWeightMap = {
  1: 10,
  2: 10,
  3: 10,
  4: 5,
  5: 2,
};

const EXAM_STANDARD_WEIGHT_MULTIPLIER = 4;

export function getHistoryFactor(stat?: UserStandardStats) {
  if (!stat) {
    return 1.0;
  }

  if (stat.last_result_status === 'SKIPPED' || stat.last_result_status === 'WRONG') {
    return 0.8;
  }

  if (stat.last_result_status === 'REVIEW') {
    return 0.6;
  }

  if (stat.wrong_count > 0) {
    return 0.7;
  }

  if (stat.last_result_status === 'CORRECT') {
    return 0.3;
  }

  if (stat.last_result_status === 'EXCELLENT') {
    return 0.15;
  }

  return 1.0;
}

export function computeFinalWeight(standard: Standard, stat?: UserStandardStats) {
  const levelWeight = levelWeightMap[standard.level] ?? 1;
  const examWeight = Array.isArray(standard.exam_years) && standard.exam_years.length > 0 ? EXAM_STANDARD_WEIGHT_MULTIPLIER : 1;
  return levelWeight * getHistoryFactor(stat) * examWeight;
}

export function pickWeightedRandomStandard(
  standards: Standard[],
  statsMap: Map<string, UserStandardStats>,
  excludeStandardId?: string | null,
) {
  const pool =
    excludeStandardId && standards.length > 1
      ? standards.filter((standard) => standard.id !== excludeStandardId)
      : standards;

  if (pool.length === 0) {
    return null;
  }

  const weights = pool.map((standard) => computeFinalWeight(standard, statsMap.get(standard.id)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  let target = Math.random() * totalWeight;
  for (let index = 0; index < pool.length; index += 1) {
    target -= weights[index] ?? 0;
    if (target <= 0) {
      return pool[index];
    }
  }

  return pool[pool.length - 1] ?? null;
}

export function pickRandomWrongStandard(
  standards: Standard[],
  preferredStandardId?: string | null,
  excludeStandardId?: string | null,
) {
  if (preferredStandardId) {
    const preferred = standards.find((standard) => standard.id === preferredStandardId);
    if (preferred) {
      return preferred;
    }
  }

  const pool =
    excludeStandardId && standards.length > 1
      ? standards.filter((standard) => standard.id !== excludeStandardId)
      : standards;

  if (pool.length === 0) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
