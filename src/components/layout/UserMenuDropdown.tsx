import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, Bookmark, LogOut } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { getAvatarUrl } from '@/utils/imageHelper';
import { ROUTES } from '@/constants/routes';

interface UserMenuDropdownProps {
  /** If true, shows Orders and Saved Designs links. If false, only My Account and Log Out. */
  showExtraLinks?: boolean;
}

export function UserMenuDropdown({ showExtraLinks = true }: UserMenuDropdownProps) {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  if (!customer) return null;

  return (
    <div
      className="relative z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300 overflow-hidden outline-none ${isOpen ? 'ring-1 ring-white bg-white/20' : ''}`}
      >
        <img src={getAvatarUrl(customer?.profileImage)} alt="" className="w-full h-full object-cover" />
      </button>

      {/* User Dropdown */}
      <div className={`absolute right-0 top-full pt-4 transition-all duration-300 ease-out z-50 ${isOpen
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
        <div className="w-56 rounded-xl bg-white border border-primary/20 p-2 shadow-float">
          <div className="px-3 py-2 border-b border-border/50 mb-1">
            <p className="text-sm font-medium text-foreground truncate">{customer?.name}</p>
            {customer?.email && (
              <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
            )}
          </div>
          
          <Link
            to={showExtraLinks ? ROUTES.ACCOUNT_TAB('profile') : ROUTES.ACCOUNT}
            onClick={closeMenu}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <User className="w-4 h-4" />
            My Account
          </Link>
          
          {showExtraLinks && (
            <>
              <Link
                to={ROUTES.ACCOUNT_TAB('orders')}
                onClick={closeMenu}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Package className="w-4 h-4" />
                My Orders
              </Link>
              <Link
                to={ROUTES.ACCOUNT_TAB('designs')}
                onClick={closeMenu}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Saved Designs
              </Link>
              <div className="border-t border-border/50 my-1" />
            </>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
