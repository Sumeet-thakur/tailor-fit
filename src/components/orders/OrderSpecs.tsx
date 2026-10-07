import React, { useState } from 'react';
import {
    Shirt,
    Scissors,
    Ruler,
    Layers,
    Palette,
    Grid,
    Box,
    ZoomIn,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMeasurementFields, getMeasurementLabel } from '@/utils/measurementUtils';
import { getItemPreviewImage } from '@/lib/screenshotUtils';
import { getProductPlaceholder } from '@/lib/placeholders';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface OrderSpecsProps {
    items: any[];
    className?: string;
    onUpdate?: (itemId: string, measurements: Record<string, string>) => void;
    allowZoom?: boolean;
}

import { Input } from '@/components/ui/input';

import { SavedDesignPreviewModal } from '@/components/modals/SavedDesignPreviewModal';

/** Order item preview with onError fallback and "Product unavailable" badge */
function OrderItemPreview({ item, allowZoom, onZoomClick }: { item: any; allowZoom: boolean; onZoomClick: () => void }) {
    const [imageError, setImageError] = useState(false);
    const primarySrc = getItemPreviewImage(item);
    const fallbackSrc = getProductPlaceholder(item.productCategory);
    const imageSrc = imageError || !primarySrc ? fallbackSrc : primarySrc;
    const isUnavailable = imageError;

    return (
        <div
            className={`relative w-full h-full cursor-pointer group ${allowZoom && primarySrc ? '' : 'pointer-events-none'}`}
            onClick={onZoomClick}
        >
            <img
                src={imageSrc}
                alt={`${item.productName || 'Product'} preview`}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
            />
            {primarySrc && !imageError && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                    <span className="bg-white/90 text-primary text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-md flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Zoom
                    </span>
                </div>
            )}
            {isUnavailable && (
                <span className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded bg-destructive/90 px-2 py-0.5 text-[10px] font-medium text-white">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Product unavailable
                </span>
            )}
        </div>
    );
}

export const OrderSpecs: React.FC<OrderSpecsProps> = ({ items, className, onUpdate, allowZoom = true }) => {
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!items || items.length === 0) return null;

    return (
        <div className={`space-y-8 ${className}`}>
            {items.map((item, index) => (
                <Card key={index} className="overflow-hidden border-2 border-slate-200">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row border-b border-slate-100">
                            {/* LEFT COLUMN: Details */}
                            <div className="flex-1 p-6 flex flex-col gap-6">
                                {/* Header Details */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <CardTitle className="text-xl font-display text-slate-900">
                                            {item.productName}
                                        </CardTitle>
                                        <Badge variant="secondary" className="capitalize font-normal md:hidden">
                                            {item.productCategory}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        <Badge variant="secondary" className="capitalize font-normal hidden md:inline-flex">
                                            {item.productCategory}
                                        </Badge>
                                        <span>Qty: {item.quantity}</span>
                                    </div>
                                </div>

                                {/* Fabric Details (Moved here) */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-3 text-sm">
                                        <Palette className="w-4 h-4 text-primary" /> Fabric Details
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        {item.fabric?.image && (
                                            <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                <img src={item.fabric.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900">{item.fabric?.name || 'Standard Fabric'}</p>
                                            {item.fabric?.id && <p className="text-xs text-slate-500 font-mono">ID: {item.fabric.id}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Large Thumbnail */}
                            <div className="w-full md:w-64 bg-slate-50 border-l border-slate-100 p-4 flex items-center justify-center">
                                <div className="w-48 h-64 rounded-lg bg-white border border-slate-200 p-2 flex items-center justify-center overflow-hidden relative shadow-sm">
                                    <OrderItemPreview
                                        item={item}
                                        allowZoom={allowZoom}
                                        onZoomClick={() => {
                                            if (allowZoom && getItemPreviewImage(item)) {
                                                setSelectedItem(item);
                                                setIsModalOpen(true);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Style Specifications Grid */}
                        {(item.styles && Object.keys(item.styles).length > 0) && (
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                                    <Scissors className="w-4 h-4 text-primary" /> Construction Styles
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Object.entries(item.styles).map(([key, style]: [string, any]) => (
                                        style && (
                                            <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {/* Icon matching based on key could be added here */}
                                                    <span className="font-medium text-slate-700 capitalize break-words whitespace-normal text-start leading-tight">
                                                        {style.name?.replace(/-/g, ' ') || style}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Measurements Grid */}
                        {getMeasurementFields(item.productCategory).length > 0 && (
                            <div className="p-6">
                                <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                                    <Ruler className="w-4 h-4 text-primary" /> Measurements
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {getMeasurementFields(item.productCategory).map((key) => {
                                        const value = item.measurements?.[key] || '';
                                        const isMandatory = true; // All fields from getMeasurementFields are considered main fields
                                        // If we are in edit mode (onUpdate provided), show input. 
                                        // Otherwise show value if it exists, or '-' if not.

                                        if (onUpdate) {
                                            return (
                                                <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                    <label className="text-xs uppercase tracking-wide font-semibold text-slate-500 block mb-1.5">
                                                        {getMeasurementLabel(key)} <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Input
                                                            value={value}
                                                            onChange={(e) => {
                                                                const newValue = e.target.value;
                                                                // Only allow numbers and decimal point
                                                                if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
                                                                    onUpdate(item.id, { ...item.measurements, [key]: newValue });
                                                                }
                                                            }}
                                                            className={`h-9 bg-white ${!value ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                                                            placeholder="0.0"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                                            in
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // View Mode
                                        // Show placeholder if value is missing
                                        const displayValue = value || '-';

                                        return (
                                            <div key={key} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                                <span className="text-xs uppercase tracking-wide font-semibold text-slate-400 block mb-1">
                                                    {getMeasurementLabel(key)}
                                                </span>
                                                <span className="font-mono text-lg font-medium text-slate-700">
                                                    {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}{typeof displayValue === 'number' || (displayValue !== '-' && !isNaN(Number(displayValue))) ? '"' : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            <SavedDesignPreviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                design={selectedItem ? {
                    ...selectedItem,
                    name: selectedItem.productName,
                    savedAt: selectedItem.createdAt || new Date().toISOString() // Fallback date
                } : null}
                onRestore={(design) => {
                    // For Admin/Order History, "Restore" might mean "Order Again" or just "View"
                    // We can potentially redirect to customizer with this config if needed, 
                    // but for now, we just close the modal or maybe show a toast.
                    // The user request said "preview", not necessarily restore functionality here.
                    // We can disable the restore button in the modal via props if we wanted, 
                    // but the modal interface requires onRestore. 
                    // Let's just log or no-op.
                    setIsModalOpen(false);
                }}
                onRequestDelete={() => {
                    // Admins/Orders shouldn't delete via this modal usually
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
};
