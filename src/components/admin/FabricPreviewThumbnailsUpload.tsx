import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { getImageUrl } from '@/utils/imageHelper';

export interface FabricPreviewThumbnailsUploadProps {
  /** Current thumbnail URLs */
  thumbnails: string[];
  /** Called when thumbnails change (add/remove) */
  onChange: (thumbnails: string[]) => void;
  /** Upload handler - returns URL or null */
  onUpload: (file: File, folder: string, customId?: string) => Promise<string | null>;
  /** Product/category prefix for upload path (e.g. 'products', 'shirt', 'pants') */
  uploadFolder?: string;
  /** Custom ID prefix for uploads (e.g. product slug) */
  uploadPrefix?: string;
  /** Max thumbnails allowed */
  maxCount?: number;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
}

/**
 * Modular fabric preview thumbnails upload for 2D shirt, 2D pant, and 3D shirt.
 * Admin uploads images; count matches total uploads. Reused across product forms.
 */
export function FabricPreviewThumbnailsUpload({
  thumbnails = [],
  onChange,
  onUpload,
  uploadFolder = 'products',
  uploadPrefix = 'preview-thumbnails',
  maxCount = 12,
  label = 'Fabric Preview Thumbnails',
  helperText = 'Images shown as thumbnails before customization. Upload count = displayed count.',
}: FabricPreviewThumbnailsUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files?.length || thumbnails.length >= maxCount) return;
    e.target.value = '';

    setUploading(true);
    const newUrls: string[] = [];
    const toAdd = Math.min(files.length, maxCount - thumbnails.length);
    const timestamp = Date.now();

    try {
      for (let i = 0; i < toAdd; i++) {
        const file = files[i];
        if (!file) continue;
        const nextIndex = thumbnails.length + newUrls.length;
        const customId = `${uploadPrefix}/thumb-${nextIndex}-${timestamp}`;
        const path = await onUpload(file, uploadFolder, customId);
        if (path) newUrls.push(path);
      }
      if (newUrls.length) {
        onChange([...thumbnails, ...newUrls]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number): void => {
    const updated = thumbnails.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">
          {thumbnails.length} / {maxCount}
        </span>
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAdd}
        className="hidden"
      />
      <div className="flex flex-wrap gap-3">
        {thumbnails.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-border/50 bg-muted/30 group"
          >
            <img
              src={getImageUrl(url)}
              alt={`Fabric preview ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Remove thumbnail"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {thumbnails.length < maxCount && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
