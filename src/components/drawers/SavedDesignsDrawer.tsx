// Saved designs drawer: uses SliderDrawer. Reused in Customize, Customize3D, SiteLayout.
import { Bookmark } from 'lucide-react';
import { SliderDrawer } from '@/components/ui/SliderDrawer';

interface SavedDesignsDrawerProps {
  open: boolean;
  onClose: () => void;
  count: number;
  children: React.ReactNode;
  fullWidthMobile?: boolean;
}

export function SavedDesignsDrawer({
  open,
  onClose,
  count,
  children,
  fullWidthMobile = false,
}: SavedDesignsDrawerProps) {
  return (
    <SliderDrawer
      open={open}
      onClose={onClose}
      title="Saved Designs"
      subtitle={`${count} saved design${count !== 1 ? 's' : ''}`}
      icon={<Bookmark className="w-5 h-5 text-primary" />}
      fullWidthMobile={fullWidthMobile}
    >
      {children}
    </SliderDrawer>
  );
}
