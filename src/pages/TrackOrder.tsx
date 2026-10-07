import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Package, Clock, CheckCircle2, Truck, ArrowRight, Loader2,
  XCircle, Home as HomeIcon, Scissors, Mail, Hash
} from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { orderService } from '@/services/orders';
import { ApiError } from '@/lib/apiClient';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import { PaymentStatusBadge, TransactionIdDisplay } from '@/components/common/PaymentStatusBadge';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    productName: string;
    productCategory: string;
    baseImage: string;
    totalPrice: number;
    quantity: number;
  }>;
  total: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
}

export default function TrackOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<'order' | 'email'>('order');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const orderFromUrl = searchParams.get('order');

  useEffect(() => {
    if (orderFromUrl?.trim()) {
      setSearchType('order');
      setSearchValue(orderFromUrl.trim().toUpperCase());
      setHasSearched(true);
      setLoading(true);
      setError('');
      setOrders([]);
      orderService
        .getByOrderNumber(orderFromUrl.trim().toUpperCase())
        .then((order) => setOrders([order]))
        .catch((err) => {
          const apiError = err as ApiError;
          setError(apiError.message || 'Failed to find order');
        })
        .finally(() => setLoading(false));
    }
  }, [orderFromUrl]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      setError('Please enter a value to search');
      return;
    }

    setLoading(true);
    setError('');
    setOrders([]);
    setHasSearched(true);

    try {
      if (searchType === 'order') {
        // Search by order number
        const order = await orderService.getByOrderNumber(searchValue.trim().toUpperCase());
        setOrders([order]);
      } else {
        // Search by email - need to add this to orderService or use apiClient directly
        const orders = await orderService.getAll();
        // Filter by email on client side (or add endpoint to backend)
        const filtered = orders.filter(o =>
          o.customer.email.toLowerCase() === searchValue.trim().toLowerCase()
        );
        setOrders(filtered);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to find order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
      pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
      confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle2 },
      in_production: { label: 'In Production', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Scissors },
      ready: { label: 'Ready', color: 'text-green-700', bgColor: 'bg-green-100', icon: Package },
      shipped: { label: 'Shipped', color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Truck },
      delivered: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: HomeIcon },
      cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
    };
    return statusMap[status] || statusMap.pending;
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground mb-3">
            Track Your Order
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter your order number or email address to check the status of your order
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-6">
            {/* Search Type Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setSearchType('order'); setSearchValue(''); setError(''); setOrders([]); setHasSearched(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${searchType === 'order'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
              >
                <Hash className="w-4 h-4" />
                Order Number
              </button>
              <button
                onClick={() => { setSearchType('email'); setSearchValue(''); setError(''); setOrders([]); setHasSearched(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${searchType === 'email'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
              >
                <Mail className="w-4 h-4" />
                Email Address
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Input
                  type={searchType === 'email' ? 'email' : 'text'}
                  placeholder={searchType === 'order' ? 'Enter order number (e.g., TF2601XXXXX)' : 'Enter your email address'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-14 pl-5 pr-12 rounded-xl text-lg"
                />
                {searchType === 'order' ? (
                  <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                ) : (
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Results */}
        {hasSearched && !loading && (
          <div className="max-w-3xl mx-auto">
            {orders.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-medium text-foreground mb-2">No Orders Found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchType === 'order'
                    ? "We couldn't find an order with that number. Please check and try again."
                    : "No orders found for this email address."}
                </p>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
                >
                  Start Shopping
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  {orders.length === 1 ? 'Order Found' : `${orders.length} Orders Found`}
                </h2>

                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl border border-border/50 shadow-soft p-6 hover:shadow-elevated transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order Number</p>
                          <p className="font-display text-xl font-bold text-foreground">{order.orderNumber}</p>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </div>

                      {/* Payment Info */}
                      {(order.paymentStatus || order.transactionId) && (
                        <div className="flex flex-wrap items-center gap-3 pb-2">
                          {order.paymentStatus && (
                            <PaymentStatusBadge
                              paymentStatus={order.paymentStatus}
                              paymentMethod={order.paymentMethod}
                              variant="inline"
                            />
                          )}
                          {order.transactionId && (
                            <TransactionIdDisplay transactionId={order.transactionId} />
                          )}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((item, i) => (
                              <div
                                key={i}
                                className="w-12 h-12 rounded-lg bg-muted/30 border-2 border-white overflow-hidden"
                              >
                                {getItemPreviewImage(item) && (
                                  <img src={getItemPreviewImage(item)!} alt={item.productName} className="w-full h-full object-contain p-1" />
                                )}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="w-12 h-12 rounded-lg bg-muted/50 border-2 border-white flex items-center justify-center text-xs font-medium text-muted-foreground">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </p>
                            <p className="font-semibold text-foreground">{formatPrice(order.total)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Ordered on</p>
                            <p className="text-sm font-medium text-foreground">
                              {new Date(order.createdAt).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <Link
                            to={`/order/${order.orderNumber}`}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        {!hasSearched && (
          <div className="max-w-xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              Can't find your order? Make sure you're using the correct order number or the email address you used when placing the order.
            </p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
