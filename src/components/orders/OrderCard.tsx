import React from 'react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/formatPrice';
import { getOrderStatusInfo } from '@/lib/orderStatusUtils';
import { PaymentStatusBadge, getPaymentHint } from '@/components/common/PaymentStatusBadge';
import { ShoppingBag, User, Calendar, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface OrderCardProps {
    order: {
        _id: string;
        orderNumber?: string;
        status: string;
        paymentStatus?: string;
        paymentMethod?: string;
        customer?: { name?: string };
        createdAt: string;
        total?: number;
        items?: unknown[];
        transactionId?: string;
    };
    variant?: 'admin' | 'customer';
    actions?: React.ReactNode;
    onClick?: () => void;
}

export function OrderCard({ order, variant = 'customer', actions, onClick }: OrderCardProps) {
    const statusInfo = getOrderStatusInfo(order.status);
    const statusBadgeClasses = `${statusInfo.bgColor} ${statusInfo.color}`;
    const paymentHint = getPaymentHint(order.paymentMethod, order.paymentStatus);

    return (
        <div
            className="bg-white p-5 rounded-2xl border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-500 animate-fade-up motion-reduce:animate-none flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            onClick={onClick}
        >
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusInfo.bgColor} ${statusInfo.color}`}
                >
                    <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-display font-semibold text-foreground text-lg">{order.orderNumber}</h4>
                        <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide shrink-0 ${statusBadgeClasses} border border-current opacity-80`}
                        >
                            {statusInfo.label}
                        </span>
                        {order.paymentStatus && order.status !== 'cancelled' && (
                            <PaymentStatusBadge
                                paymentStatus={order.paymentStatus}
                                paymentMethod={order.paymentMethod}
                                variant="inline"
                                showHint={false}
                            />
                        )}
                    </div>
                    {paymentHint && order.status !== 'cancelled' && (
                        <div className="text-xs mb-2 font-medium">
                            {paymentHint}
                        </div>
                    )}
                    <div className="text-sm text-muted-foreground space-y-0.5">
                        {variant === 'admin' && order.customer?.name && (
                            <p className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> {order.customer.name}
                            </p>
                        )}
                        <p className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                            {variant === 'customer' && ` • ${formatPrice(order.total || 0)}`}
                        </p>
                        <p className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {new Date(order.createdAt).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 shrink-0 border-t md:border-0 pt-3 md:pt-0 mt-3 md:mt-0">
                {variant === 'admin' && (
                    <div className="flex flex-row md:flex-col justify-between md:items-end gap-1 md:gap-0 mr-4">
                        <p className="md:hidden text-sm font-medium text-foreground">{order.items?.length || 0} items</p>
                        <p className="font-display text-lg font-bold text-primary">{formatPrice(order.total || 0)}</p>
                    </div>
                )}

                <div className={`flex flex-col sm:flex-row gap-2 ${variant === 'admin' ? 'md:border-l md:pl-6' : ''}`}>
                    {actions}
                </div>
            </div>
        </div>
    );
}
