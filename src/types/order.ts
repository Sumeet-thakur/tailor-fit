export interface OrderItem {
    _id?: string;
    product: any;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
}

export interface Order {
    _id: string;
    orderNumber?: string;
    user?: {
        _id: string;
        name: string;
        email: string;
    } | string;
    // AdminOrdersTab uses 'customer' for display, sometimes populated from user or separate field
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: any;
    };
    items: OrderItem[];
    totalAmount: number;
    total?: number; // Alias often used in frontend
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    paymentGateway?: string;
    transactionId?: string;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    createdAt: string;
    updatedAt: string;
    paymentDetails?: any;
    discount?: number;
    promoCode?: string;
    cancelReason?: string;
}
