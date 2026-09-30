import { neon } from '@neondatabase/serverless';

const STORAGE_NEON_URL_KEY = 'nuts_neon_database_url';

export const getDatabaseUrl = (): string => {
  // 1. Check user-configured override in localStorage (allows instant configuration on Netlify)
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_NEON_URL_KEY);
    if (local && local.trim()) return local.trim();
  }

  // 2. Check Vite build-time environment variable
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEON_DATABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.DATABASE_URL) ||
    '';

  return (envUrl || '').trim();
};

export const setDatabaseUrl = (url: string | null): void => {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_NEON_URL_KEY);
  } else {
    localStorage.setItem(STORAGE_NEON_URL_KEY, url.trim());
  }
};

export const isNeonConfigured = (): boolean => {
  const url = getDatabaseUrl();
  return Boolean(
    url &&
    (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
    !url.includes('placeholder') &&
    !url.includes('your-project')
  );
};

export const getDb = () => {
  const url = getDatabaseUrl();
  if (!isNeonConfigured() || !url) return null;
  return neon(url, { disableWarningInBrowsers: true });
};
