// Payment method and status constants. Used by Checkout, Account, Admin, OrderConfirmation.
// Safepay is the primary online gateway for PKR payments.

export const PAYMENT_METHODS = {
  COD: 'cod',
  BANK_TRANSFER: 'bank_transfer',
  SAFEPAY: 'safepay',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export interface PaymentStatusInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor?: string;
}

const PAYMENT_STATUS_MAP: Record<string, PaymentStatusInfo> = {
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  pending_verification: { label: 'Verifying', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  unpaid: { label: 'Unpaid', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  refunded: { label: 'Refunded', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

export function getPaymentStatusInfo(status: string): PaymentStatusInfo {
  const normalized = (status || 'pending').toLowerCase();
  return PAYMENT_STATUS_MAP[normalized] ?? PAYMENT_STATUS_MAP.pending;
}

export function formatPaymentMethodLabel(method: string): string {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'bank_transfer') return 'Bank Transfer';
  if (method === 'safepay') return 'Safepay';
  return (method || 'COD').replace(/_/g, ' ');
}
