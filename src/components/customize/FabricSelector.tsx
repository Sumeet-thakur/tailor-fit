import { Check, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/formatPrice';
import { getFabricThumbnailUrl } from '@/services/fabricService';

interface FabricSelectorProps {
    fabrics: any[];
    selectedFabricId?: string;
    onSelect: (fabric: any) => void;
    className?: string;
}

export function FabricSelector({
    fabrics,
    selectedFabricId,
    onSelect,
    className
}: FabricSelectorProps) {

    return (
        <div
            className={cn(
                "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in fade-in duration-300 w-full max-w-full",
                className
            )}
            style={{ animationDelay: '100ms' }}
        >
            {fabrics && fabrics.length > 0 ? (
                fabrics.map((fabric, index) => {
                    const fabricId = fabric._id || fabric.id;
                    const swatchSrc = getFabricThumbnailUrl(fabric, true)
                        || fabric.imageUrl
                        || fabric.image
                        || fabric.previewImage
                        || '/images/placeholders/shirt.svg';

                    return (
                        <button
                            key={fabricId || `fabric-${index}`}
                            onClick={() => onSelect(fabric)}
                            className={cn(
                                "group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white",
                                selectedFabricId && (String(selectedFabricId) === String(fabric.id) || String(selectedFabricId) === String(fabric._id))
                                    ? "border-primary/60 bg-primary/5 shadow-md"
                                    : "border-transparent shadow-sm hover:shadow-md hover:border-primary/30"
                            )}
                        >
                            <div className="aspect-square bg-muted/20">
                                <img
                                    src={swatchSrc}
                                    alt={fabric.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.src = '/images/placeholders/shirt.svg';
                                    }}
                                />
                            </div>
                            <div className={cn(
                                "p-3 text-center transition-colors",
                                selectedFabricId && (String(selectedFabricId) === String(fabric.id) || String(selectedFabricId) === String(fabric._id))
                                    ? "bg-gray-100"
                                    : "bg-white"
                            )}>
                                <p className="font-medium text-sm text-foreground truncate mb-1">{fabric.name}</p>
                                {(fabric.priceModifier > 0 || fabric.price > 0) && (
                                    <p className="text-xs text-muted-foreground">
                                        Rs {formatPrice(fabric.priceModifier || fabric.price).replace('PKR ', '')}
                                    </p>
                                )}
                            </div>
                            {selectedFabricId && (String(selectedFabricId) === String(fabric.id) || String(selectedFabricId) === String(fabric._id)) && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })
            ) : (
                <div className="col-span-full text-center py-8">
                    <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No fabrics available</p>
                </div>
            )}
        </div>
    );
}
