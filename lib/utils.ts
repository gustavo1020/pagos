/**
 * Format amount to ARS currency
 * @param cents Amount in cents
 * @returns Formatted string like "$210.000"
 */
export function formatCurrency(cents: number): string {
  const pesos = Math.floor(cents / 100);
  return `$${pesos.toLocaleString("es-AR")}`;
}

/**
 * Parse ARS currency to cents
 * @param value String like "210000" or "210,000"
 * @returns Amount in cents
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) * 100;
}

/**
 * Calculate the net balance between two users
 * Total debts - Total payments = remaining debt
 * Positive = user1 owes user2
 * Negative = user2 owes user1
 */
export function calculateBalance(
  totalDebts: number,
  totalPayments: number
): number {
  return totalDebts - totalPayments;
}

/**
 * Format date to local format
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-AR");
}
