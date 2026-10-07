// Single source for order status labels and styles. Used by Account, Admin, OrderConfirmation, TrackOrder.
import type { LucideIcon } from 'lucide-react';
import { Clock, CheckCircle2, Scissors, Package, Truck, Home, XCircle } from 'lucide-react';

export interface OrderStatusInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

const ORDER_STATUS_MAP: Record<string, OrderStatusInfo> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle2 },
  in_production: { label: 'In Production', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Scissors },
  processing: { label: 'Processing', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Scissors },
  ready: { label: 'Ready', color: 'text-green-700', bgColor: 'bg-green-100', icon: Package },
  shipped: { label: 'Shipped', color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: Home },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

export function getOrderStatusInfo(status: string): OrderStatusInfo {
  const normalized = (status || 'pending').toLowerCase().replace(/\s+/g, '_');
  return ORDER_STATUS_MAP[normalized] ?? ORDER_STATUS_MAP.pending;
}

export const ORDER_STATUS_OPTIONS = ['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'] as const;
