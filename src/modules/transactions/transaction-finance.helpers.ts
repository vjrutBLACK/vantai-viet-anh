/** Chuẩn API tài chính (FE) ↔ lưu DB (transactionType: income|expense, category: UPPER hoặc legacy) */

export type FinanceTypeApi = 'INCOME' | 'EXPENSE';
export type FinanceCategoryApi =
  | 'TRIP_PAYMENT'
  | 'FUEL'
  | 'REPAIR'
  | 'SALARY';

export function normalizeTypeToDb(
  raw: string | undefined,
): 'income' | 'expense' | null {
  if (!raw) return null;
  const u = String(raw).toUpperCase();
  if (u === 'INCOME') return 'income';
  if (u === 'EXPENSE') return 'expense';
  if (raw === 'income' || raw === 'expense') return raw;
  return null;
}

export function typeDbToApi(t: string): FinanceTypeApi {
  return String(t).toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE';
}

/** Chuẩn hóa category về mã FE (uppercase) */
export function normalizeCategoryToCanonical(cat: string | null | undefined): string {
  if (!cat) return 'OTHER';
  const u = String(cat).trim().toUpperCase();
  if (['TRIP_PAYMENT', 'FUEL', 'REPAIR', 'SALARY'].includes(u)) return u;
  const c = String(cat).trim().toLowerCase();
  if (c === 'fuel') return 'FUEL';
  if (c === 'salary' || c === 'payroll') return 'SALARY';
  if (c === 'maintenance' || c === 'repair') return 'REPAIR';
  if (c === 'revenue' || c === 'trip_payment') return 'TRIP_PAYMENT';
  return u;
}

export function validateTypeCategoryPair(
  typeDb: 'income' | 'expense',
  categoryCanon: string,
): void {
  const incomeCats = new Set(['TRIP_PAYMENT']);
  const expenseCats = new Set(['FUEL', 'REPAIR', 'SALARY']);
  if (typeDb === 'income' && !incomeCats.has(categoryCanon)) {
    throw new Error('INCOME chỉ dùng với category TRIP_PAYMENT');
  }
  if (typeDb === 'expense' && !expenseCats.has(categoryCanon)) {
    throw new Error('EXPENSE chỉ dùng với category FUEL, REPAIR hoặc SALARY');
  }
}
