import React from 'react';
import { Ruler, Trash2 } from 'lucide-react';
import { getMeasurementFields, getMeasurementLabel } from '@/utils/measurementUtils';
import { showSuccess, showError } from '@/lib/toastHelpers';

interface AccountMeasurementsTabProps {
    measurements: any[];
    onDelete: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export function AccountMeasurementsTab({ measurements, onDelete }: AccountMeasurementsTabProps) {
    const handleDeleteMeasurements = async (id: string) => {
        const result = await onDelete(id);
        if (result.success) {
            showSuccess('Measurements deleted');
        } else {
            showError(result.message || 'Failed to delete measurements');
        }
    };

    return (
        <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">Saved Measurements</h2>
            {!measurements || measurements.length === 0 ? (
                <div className="text-center py-12">
                    <Ruler className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium text-lg text-foreground mb-2">No saved measurements</h3>
                    <p className="text-muted-foreground mb-6">Save your measurements for faster checkout</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {measurements.map((m) => (
                        <div key={m._id} className="p-4 bg-white border border-border/50 rounded-2xl shadow-soft hover:shadow-elevated transition-all">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-medium text-foreground">{m.label}</p>
                                    {m.isDefault && (
                                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Default</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteMeasurements(m._id)}
                                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4 text-sm">
                                {(function () {
                                    // Infer category if not explicit
                                    const category = (m as any).productCategory ||
                                        ((m as any).inseam || (m as any).rise ? 'pants' :
                                            (m as any).jacketLength ? 'suit' : 'shirt');

                                    return getMeasurementFields(category).map(key => (
                                        <div key={key} className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-xs text-muted-foreground block mb-0.5">{getMeasurementLabel(key)}</span>
                                            <span className="font-medium text-slate-700">{(m as any)[key] ? `${(m as any)[key]}"` : '-'}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
