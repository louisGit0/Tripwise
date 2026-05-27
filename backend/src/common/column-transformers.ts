/**
 * TypeORM column transformer for DECIMAL / NUMERIC columns.
 *
 * PostgreSQL returns DECIMAL values as strings in the raw query result.
 * TypeORM does NOT automatically coerce them to numbers, which causes
 * runtime errors like `toFixed is not a function` when the JS code
 * expects a number but receives a string.
 *
 * This transformer is safe for SQLite (used in e2e tests) because
 * `parseFloat(number)` simply returns the number unchanged.
 */
export const decimalTransformer = {
  /** Write path — pass the value through unchanged. */
  to: (value: number | null): number | null => value,
  /** Read path — coerce Postgres string to JS number; preserve null. */
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const n = parseFloat(String(value));
    return isNaN(n) ? null : n;
  },
};
