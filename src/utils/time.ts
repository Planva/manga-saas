export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const toSeconds = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
