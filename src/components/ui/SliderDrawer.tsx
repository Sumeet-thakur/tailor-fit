// Slider drawer: slides in from right. Used for saved designs, cart, etc.
import { ReactNode } from 'react';

interface SliderDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Use full width on mobile (e.g. Customize3D). Default: w-96 */
  fullWidthMobile?: boolean;
}

export function SliderDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  fullWidthMobile = false,
}: SliderDrawerProps) {
  const panelWidth = fullWidthMobile ? 'w-full sm:w-96' : 'w-[95vw] sm:w-96 max-w-[384px]';
  const maxWidth = fullWidthMobile ? 'max-w-[95vw] sm:max-w-[90vw]' : 'max-w-[95vw] sm:max-w-[90vw]';

  return (
    <div
      className={`fixed inset-0 z-[55] transition-opacity duration-300 ease-out ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div className="fixed inset-x-0 bottom-0 top-[68px] bg-black/50" />
      <div
        className={`absolute right-0 top-[68px] bottom-0 ${panelWidth} ${maxWidth} bg-white shadow-float overflow-y-auto transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border/50 p-4 z-10 shrink-0">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle != null && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-border/50 p-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
