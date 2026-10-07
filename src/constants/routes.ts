// Centralized route paths. Used across app for navigation. Change once, reflects everywhere.
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  CUSTOMIZE: (id: string) => `/customize/${id}`,
  CUSTOMIZE_3D: (type: string) => `/customize-3d/${type}`,
  CUSTOMIZER_LANDING: '/3d-customizer',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER: (orderNumber: string) => `/order/${orderNumber}`,
  ACCOUNT: '/account',
  ACCOUNT_TAB: (tab: string) => `/account?tab=${tab}`,
  LOGIN: '/login',
  ADMIN: '/admin',
  ADMIN_TAB: (tab: string) => `/admin?tab=${tab}`,
  TRACK_ORDER: '/track-order',
} as const;
