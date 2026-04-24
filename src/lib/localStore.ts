import type { AuthUser, StudyAttempt, UserStandardStats, WrongNote } from '../types';

const DEMO_USER_KEY = 'gamsanote:demo-user';
const ATTEMPTS_KEY = 'gamsanote:attempts';
const STATS_KEY = 'gamsanote:stats';
const WRONG_NOTES_KEY = 'gamsanote:wrong-notes';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getDemoUser() {
  return readJson<AuthUser | null>(DEMO_USER_KEY, null);
}

export function setDemoUser(user: AuthUser | null) {
  if (!canUseStorage()) {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(DEMO_USER_KEY);
    return;
  }

  writeJson(DEMO_USER_KEY, user);
}

export function getLocalAttempts(userId: string) {
  return readJson<StudyAttempt[]>(ATTEMPTS_KEY, []).filter((item) => item.user_id === userId);
}

export function setLocalAttempts(attempts: StudyAttempt[]) {
  writeJson(ATTEMPTS_KEY, attempts);
}

export function getLocalStats(userId: string) {
  return readJson<UserStandardStats[]>(STATS_KEY, []).filter((item) => item.user_id === userId);
}

export function setLocalStats(stats: UserStandardStats[]) {
  writeJson(STATS_KEY, stats);
}

export function getLocalWrongNotes(userId: string) {
  return readJson<WrongNote[]>(WRONG_NOTES_KEY, []).filter((item) => item.user_id === userId);
}

export function setLocalWrongNotes(notes: WrongNote[]) {
  writeJson(WRONG_NOTES_KEY, notes);
}

export function mergeLocalByUser<T extends { user_id: string }>(
  key: string,
  userId: string,
  nextItems: T[],
) {
  const current = readJson<T[]>(key, []);
  const merged = [...current.filter((item) => item.user_id !== userId), ...nextItems];
  writeJson(key, merged);
}

export const localStoreKeys = {
  ATTEMPTS_KEY,
  STATS_KEY,
  WRONG_NOTES_KEY,
};
