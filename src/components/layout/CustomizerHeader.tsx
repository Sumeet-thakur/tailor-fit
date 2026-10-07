import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Bookmark, ShoppingBag, User, LogOut, Package } from 'lucide-react';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { getAvatarUrl } from '@/utils/imageHelper';
import { ROUTES } from '@/constants/routes';
interface CustomizerHeaderProps {
  title: string;
  subtitle?: string;
  savedCount: number;
  cartCount: number;
  onSavedClick: () => void;
  onCartClick: () => void;
  isAuthenticated: boolean;
  customer?: { name?: string; email?: string; profileImage?: string } | null;
  onLogout: () => void;
  onCloseUserMenu?: () => void;
  showExtraLinks?: boolean;
  isSavedOpen?: boolean;
  isCartOpen?: boolean;
}

export function CustomizerHeader({
  title,
  subtitle,
  savedCount,
  cartCount,
  onSavedClick,
  onCartClick,
  isAuthenticated,
  customer,
  onLogout,
  onCloseUserMenu,
  showExtraLinks = false,
  isSavedOpen = false,
  isCartOpen = false,
}: CustomizerHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleMouseEnter = () => setIsUserMenuOpen(true);
  const handleMouseLeave = () => setIsUserMenuOpen(false);
  const closeMenu = () => {
    setIsUserMenuOpen(false);
    onCloseUserMenu?.();
  };

  return (
    <header className="bg-primary py-3 z-[60] shrink-0 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between relative">
          <Link to="/" className="flex items-center gap-3 group z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-glow transition-all duration-300">
                <Scissors className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-45" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-white">Tailor Fit</h1>
              <p className="text-[11px] font-medium text-white/60">Bespoke Tailoring</p>
            </div>
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 text-center hidden sm:block">
            <h1 className="font-display text-lg lg:text-xl font-bold text-white whitespace-nowrap">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] lg:text-[11px] font-medium text-white/60 capitalize">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 z-10">
            {/* Notifications */}
            {isAuthenticated && <NotificationPanel />}

            <button
              onClick={onSavedClick}
              className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300 ${isSavedOpen ? 'bg-white/20 ring-1 ring-white' : ''}`}
            >
              <Bookmark className="w-5 h-5" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>
            <button
              onClick={onCartClick}
              className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300 ${isCartOpen ? 'bg-white/20 ring-1 ring-white' : ''}`}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            {isAuthenticated ? (
              <UserMenuDropdown showExtraLinks={showExtraLinks} />
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
