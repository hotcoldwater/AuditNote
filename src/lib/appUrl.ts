const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim() ?? '';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function parseUrl(value: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(trimTrailingSlash(value));
  } catch {
    return null;
  }
}

export function getConfiguredSiteUrl() {
  return trimTrailingSlash(configuredSiteUrl);
}

export function getCanonicalOrigin() {
  return parseUrl(configuredSiteUrl)?.origin ?? null;
}

export function getCurrentOrigin() {
  if (typeof window === 'undefined') {
    return getCanonicalOrigin() ?? '';
  }

  return trimTrailingSlash(window.location.origin);
}

export function getSiteOrigin() {
  return getCanonicalOrigin() ?? getCurrentOrigin();
}

export function getAuthCallbackUrl(next = '/auth/confirmed') {
  const callback = new URL('/auth/callback', `${getSiteOrigin()}/`);
  callback.searchParams.set('next', next);
  return callback.toString();
}

export function shouldRedirectToCanonicalOrigin() {
  if (typeof window === 'undefined') {
    return false;
  }

  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) {
    return false;
  }

  const current = new URL(window.location.href);
  const canonical = new URL(canonicalOrigin);
  const isLocalHost =
    current.hostname === 'localhost' ||
    current.hostname === '127.0.0.1' ||
    current.hostname === '0.0.0.0';

  if (isLocalHost) {
    return false;
  }

  return current.origin !== canonical.origin;
}

export function getCanonicalRedirectUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) {
    return null;
  }

  const current = new URL(window.location.href);
  const target = new URL(current.pathname + current.search + current.hash, `${canonicalOrigin}/`);
  return target.toString();
}

export function getConfiguredSiteHostLabel() {
  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) {
    return getCurrentOrigin();
  }

  return new URL(canonicalOrigin).host;
}
