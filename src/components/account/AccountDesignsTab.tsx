import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/common/ProductThumbnail';
import { SavedDesignPreviewModal } from '@/components/modals/SavedDesignPreviewModal';
import { formatPrice } from '@/lib/formatPrice';
import { getRestoreUrl } from '@/lib/designRestoration';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/lib/toastHelpers';

interface AccountDesignsTabProps {
    designs: any[];
    onDelete: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export function AccountDesignsTab({ designs, onDelete }: AccountDesignsTabProps) {
    const navigate = useNavigate();
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

    const handleDeleteDesign = async (id: string) => {
        const result = await onDelete(id);
        if (result.success) {
            showSuccess('Design deleted');
        } else {
            showError(result.message || 'Failed to delete design');
        }
    };

    return (
        <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">Saved Designs</h2>
            {!designs || designs.length === 0 ? (
                <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium text-lg text-foreground mb-2">No saved designs</h3>
                    <p className="text-muted-foreground mb-6">Customize a product and save your design</p>
                    <Link
                        to="/products"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
                    >
                        Start Customizing
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {[...designs]
                        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
                        .map((design) => (
                            <div key={design._id} className="p-4 bg-white border border-border/50 rounded-2xl shadow-soft hover:shadow-elevated transition-all">
                                <div className="flex gap-4">
                                    <div
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                            setSelectedDesign(design);
                                            setIsDesignModalOpen(true);
                                        }}
                                    >
                                        <ProductThumbnail
                                            item={design}
                                            className="w-20 h-20 rounded-lg bg-white shrink-0"
                                            imageClassName="p-2"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{design.productName}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{design.productCategory}</p>
                                        {design.fabric && (
                                            <p className="text-xs text-muted-foreground mt-1">Fabric: {design.fabric.name}</p>
                                        )}
                                        <p className="font-semibold text-primary mt-2">{formatPrice(design.totalPrice)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Link
                                        to={getRestoreUrl(design)}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-center"
                                    >
                                        Open Design
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteDesign(design._id)}
                                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Saved Design Preview Modal */}
            {selectedDesign && (
                <SavedDesignPreviewModal
                    isOpen={isDesignModalOpen}
                    onClose={() => setIsDesignModalOpen(false)}
                    design={selectedDesign}
                    onRestore={(design) => {
                        navigate(getRestoreUrl(design));
                        setIsDesignModalOpen(false);
                    }}
                    onRequestDelete={async (designId) => {
                        await handleDeleteDesign(designId);
                        setIsDesignModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
