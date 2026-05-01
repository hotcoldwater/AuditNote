import type { AuthUser, IssueReport, StudyAttempt, UserStandardStats, WrongNote } from '../types';

const DEMO_USER_KEY = 'auditnote:demo-user';
const ATTEMPTS_KEY = 'auditnote:attempts';
const STATS_KEY = 'auditnote:stats';
const WRONG_NOTES_KEY = 'auditnote:wrong-notes';
const ISSUE_REPORTS_KEY = 'auditnote:issue-reports';

const LEGACY_DEMO_USER_KEY = 'gamsanote:demo-user';
const LEGACY_ATTEMPTS_KEY = 'gamsanote:attempts';
const LEGACY_STATS_KEY = 'gamsanote:stats';
const LEGACY_WRONG_NOTES_KEY = 'gamsanote:wrong-notes';
const LEGACY_ISSUE_REPORTS_KEY = 'gamsanote:issue-reports';

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

function readJsonWithLegacyFallback<T>(key: string, legacyKey: string, fallback: T): T {
  const current = readJson<T | null>(key, null);
  if (current !== null) {
    return current;
  }
  return readJson<T>(legacyKey, fallback);
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getLegacyKey(key: string) {
  switch (key) {
    case DEMO_USER_KEY:
      return LEGACY_DEMO_USER_KEY;
    case ATTEMPTS_KEY:
      return LEGACY_ATTEMPTS_KEY;
    case STATS_KEY:
      return LEGACY_STATS_KEY;
    case WRONG_NOTES_KEY:
      return LEGACY_WRONG_NOTES_KEY;
    case ISSUE_REPORTS_KEY:
      return LEGACY_ISSUE_REPORTS_KEY;
    default:
      return '';
  }
}

export function getDemoUser() {
  return readJsonWithLegacyFallback<AuthUser | null>(DEMO_USER_KEY, LEGACY_DEMO_USER_KEY, null);
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
  return readJsonWithLegacyFallback<StudyAttempt[]>(ATTEMPTS_KEY, LEGACY_ATTEMPTS_KEY, []).filter(
    (item) => item.user_id === userId,
  );
}

export function setLocalAttempts(attempts: StudyAttempt[]) {
  writeJson(ATTEMPTS_KEY, attempts);
}

export function getLocalStats(userId: string) {
  return readJsonWithLegacyFallback<UserStandardStats[]>(STATS_KEY, LEGACY_STATS_KEY, []).filter(
    (item) => item.user_id === userId,
  );
}

export function setLocalStats(stats: UserStandardStats[]) {
  writeJson(STATS_KEY, stats);
}

export function getLocalWrongNotes(userId: string) {
  return readJsonWithLegacyFallback<WrongNote[]>(WRONG_NOTES_KEY, LEGACY_WRONG_NOTES_KEY, []).filter(
    (item) => item.user_id === userId,
  );
}

export function setLocalWrongNotes(notes: WrongNote[]) {
  writeJson(WRONG_NOTES_KEY, notes);
}

export function getLocalIssueReports(userId: string) {
  return readJsonWithLegacyFallback<IssueReport[]>(ISSUE_REPORTS_KEY, LEGACY_ISSUE_REPORTS_KEY, []).filter(
    (item) => item.user_id === userId,
  );
}

export function getAllLocalIssueReports() {
  return readJsonWithLegacyFallback<IssueReport[]>(ISSUE_REPORTS_KEY, LEGACY_ISSUE_REPORTS_KEY, []);
}

export function setLocalIssueReports(reports: IssueReport[]) {
  writeJson(ISSUE_REPORTS_KEY, reports);
}

export function mergeLocalByUser<T extends { user_id: string }>(
  key: string,
  userId: string,
  nextItems: T[],
) {
  const legacyKey = getLegacyKey(key);
  const current = legacyKey ? readJsonWithLegacyFallback<T[]>(key, legacyKey, []) : readJson<T[]>(key, []);
  const merged = [...current.filter((item) => item.user_id !== userId), ...nextItems];
  writeJson(key, merged);
}

export const localStoreKeys = {
  ATTEMPTS_KEY,
  STATS_KEY,
  WRONG_NOTES_KEY,
  ISSUE_REPORTS_KEY,
};
