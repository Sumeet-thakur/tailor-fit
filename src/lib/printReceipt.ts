/**
 * Print Receipt Utility — Generates a styled printable receipt in a new window.
 * Used across: OrderConfirmation, AccountOrdersTab, AdminOrdersTab.
 *
 * Opens a clean, branded receipt layout optimized for printing and PDF save.
 * Uses window.print() which lets users save as PDF via their browser's print dialog.
 */
import { formatPaymentMethodLabel } from '@/lib/paymentConstants';
import { formatPrice } from '@/lib/formatPrice';

interface ReceiptOrder {
    orderNumber: string;
    createdAt: string;
    customer: {
        name: string;
        email: string;
        phone: string;
        address: {
            street: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
    };
    items: Array<{
        productName: string;
        productCategory?: string;
        fabric?: { name: string } | null;
        totalPrice: number;
        quantity: number;
    }>;
    total: number;
    subtotal?: number;
    discount?: number;
    promoCode?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentGateway?: string;
    transactionId?: string;
}

export function printOrderReceipt(order: ReceiptOrder): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const orderDate = new Date(order.createdAt).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const paymentMethodLabel = formatPaymentMethodLabel(order.paymentMethod || 'cod');
    const isPaid = order.paymentStatus === 'paid';
    const isSafepay = order.paymentGateway === 'safepay';

    const itemsHtml = order.items
        .map(
            (item) => `
      <div class="item">
        <div class="row">
          <span>${item.productName}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
          <span>${formatPrice(item.totalPrice)}</span>
        </div>
        ${item.fabric?.name ? `<div class="fabric">Fabric: ${item.fabric.name}</div>` : ''}
      </div>`
        )
        .join('');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Receipt — ${order.orderNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; padding: 48px 32px; max-width: 600px; margin: 0 auto; color: #111; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 24px; margin-bottom: 28px; }
    .logo { font-size: 26px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 10px; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .badge-paid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 14px; }
    .row span:first-child { color: #374151; }
    .row span:last-child { font-weight: 500; }
    .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .item:last-child { border-bottom: none; }
    .fabric { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .discount-row { color: #16a34a; }
    .total-row { font-size: 18px; font-weight: 700; border-top: 2px solid #111; padding-top: 14px; margin-top: 14px; }
    .ref { font-family: 'Courier New', monospace; font-size: 12px; background: #f3f4f6; padding: 6px 10px; border-radius: 6px; word-break: break-all; display: inline-block; margin-top: 4px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .footer p { margin-bottom: 4px; }
    @media print {
      body { padding: 24px 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🪡 Cherry's Tailor Fit</div>
    <div class="subtitle">Official Receipt</div>
    <div class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? '✓ Payment Confirmed' : paymentMethodLabel}</div>
  </div>

  <div class="section">
    <div class="row"><span>Order Number</span><strong>${order.orderNumber}</strong></div>
    <div class="row"><span>Date</span><span>${orderDate}</span></div>
    <div class="row"><span>Customer</span><span>${order.customer.name}</span></div>
    <div class="row"><span>Email</span><span>${order.customer.email}</span></div>
    <div class="row"><span>Phone</span><span>${order.customer.phone}</span></div>
    <div class="row"><span>Payment Method</span><span>${paymentMethodLabel}</span></div>
    ${isSafepay && order.transactionId ? `<div class="row"><span>Safepay Reference</span><span class="ref">${order.transactionId}</span></div>` : ''}
    ${order.promoCode ? `<div class="row"><span>Promo Code</span><span>${order.promoCode}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Shipping Address</div>
    <div style="font-size:14px; color:#374151; line-height:1.6">
      ${order.customer.address.street}<br/>
      ${order.customer.address.city}${order.customer.address.state ? `, ${order.customer.address.state}` : ''}<br/>
      ${order.customer.address.postalCode}<br/>
      ${order.customer.address.country}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    ${itemsHtml}
  </div>

  ${order.discount && order.discount > 0 ? `<div class="row discount-row"><span>Promo Discount (${order.promoCode || ''})</span><span>− ${formatPrice(order.discount)}</span></div>` : ''}
  <div class="row total-row"><span>Total</span><span>${formatPrice(order.total)}</span></div>

  <div class="footer">
    <p><strong>Cherry's Tailor Fit</strong> · cherrytailorfit.com</p>
    <p>Thank you for your order!</p>
  </div>
</body>
</html>`);

    printWindow.document.close();
    // Small delay for fonts to load before triggering print dialog
    setTimeout(() => printWindow.print(), 300);
}
