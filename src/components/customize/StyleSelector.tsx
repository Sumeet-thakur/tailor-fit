import { Check, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/formatPrice';
import { getImageUrl, getThumbnailImageUrl } from '@/utils/imageHelper';

interface StyleSelectorProps {
    options: any[];
    selectedOptionId?: string;
    onSelect: (option: any) => void;
    showNoneOption?: boolean;
    onNoneSelect?: () => void;
    noneLabel?: string;
    className?: string;
}

export function StyleSelector({
    options,
    selectedOptionId,
    onSelect,
    showNoneOption,
    onNoneSelect,
    noneLabel = "None",
    className
}: StyleSelectorProps) {
    return (
        <div
            className={cn(
                "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in fade-in duration-300 w-full max-w-full",
                className
            )}
            style={{ animationDelay: '100ms' }}
        >
            {/* None Option */}
            {showNoneOption && onNoneSelect && (
                <button
                    onClick={onNoneSelect}
                    className={cn(
                        "group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white",
                        !selectedOptionId
                            ? "border-primary/60 bg-gray-100 shadow-md"
                            : "border-transparent shadow-sm hover:shadow-md hover:border-primary/30"
                    )}
                >
                    <div className="aspect-square bg-muted/20 flex items-center justify-center">
                        <span className="text-muted-foreground font-medium text-xs">None</span>
                    </div>
                    <div className={cn(
                        "p-2 text-center transition-colors",
                        !selectedOptionId ? "bg-gray-100" : "bg-white"
                    )}>
                        <p className="font-medium text-xs text-foreground">No {noneLabel}</p>
                    </div>
                    {!selectedOptionId && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                    )}
                </button>
            )}

            {options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                    <button
                        key={option.id}
                        onClick={() => onSelect(option)}
                        className={cn(
                            "group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-white",
                            isSelected
                                ? "border-primary/60 bg-gray-100 shadow-md"
                                : "border-transparent shadow-sm hover:shadow-md hover:border-primary/30"
                        )}
                    >
                        <div className="aspect-square bg-transparent p-3 flex items-center justify-center">
                            {option.image || option.previewImage ? (
                                <img
                                    src={getThumbnailImageUrl(option.image || option.previewImage) || (option.image || option.previewImage)}
                                    alt={option.name}
                                    className="max-w-full max-h-full object-contain option-thumbnail-svg transition-transform duration-300 group-hover:scale-105"
                                    style={{ shapeRendering: 'geometricPrecision' }}
                                />
                            ) : (
                                <Settings className="w-8 h-8 text-muted-foreground/30" />
                            )}
                        </div>
                        <div className={cn(
                            "p-2 text-center transition-colors border-t border-border/20",
                            isSelected ? "bg-gray-100" : "bg-white"
                        )}>
                            <p className="font-medium text-xs text-foreground truncate">{option.name}</p>
                            {option.priceModifier > 0 && (
                                <p className="text-[10px] text-muted-foreground">+{formatPrice(option.priceModifier)}</p>
                            )}
                        </div>
                        {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md scale-in animation-duration-300">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
