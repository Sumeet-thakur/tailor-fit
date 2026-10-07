/**
 * Centralized price formatting utility
 * Single source of truth for currency formatting across the entire application
 * 
 * Usage:
 *   import { formatPrice } from '@/lib/formatPrice';
 *   formatPrice(8500) // "PKR 8,500"
 */

export const formatPrice = (value: number | string | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return 'PKR 0';
  }

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(numValue).replace('PKR', 'PKR ').replace(/\s+/, ' ').trim();
};

/**
 * Format price modifier (for displaying price changes)
 * Usage: formatPriceModifier(500) // "+PKR 500"
 */
export const formatPriceModifier = (value: number | string | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return '';
  }

  const formatted = formatPrice(Math.abs(numValue));
  const sign = numValue >= 0 ? '+' : '-';
  return `${sign}${formatted}`;
};
