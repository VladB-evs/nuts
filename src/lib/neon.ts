import { neon } from '@neondatabase/serverless';

const databaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEON_DATABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.DATABASE_URL) ||
  '';

export const isNeonConfigured = (): boolean => {
  return Boolean(
    databaseUrl &&
    (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) &&
    !databaseUrl.includes('placeholder')
  );
};

export const getDb = () => {
  if (!isNeonConfigured()) return null;
  return neon(databaseUrl);
};
