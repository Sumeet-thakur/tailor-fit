import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toastHelpers';

interface AccountProfileTabProps {
    customer: any;
    onUpdate: (data: any) => Promise<{ success: boolean; message?: string }>;
}

export function AccountProfileTab({ customer, onUpdate }: AccountProfileTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
    });

    // Update form when customer changes, but NOT while editing
    useEffect(() => {
        if (customer && !isEditing) {
            setProfileForm({
                name: customer.name || '',
                phone: customer.phone || '',
                street: customer.address?.street || '',
                city: customer.address?.city || '',
                state: customer.address?.state || '',
                postalCode: customer.address?.postalCode || '',
            });
        }
    }, [customer, isEditing]);

    const handleSaveProfile = async () => {
        setSaving(true);
        const result = await onUpdate({
            name: profileForm.name,
            phone: profileForm.phone,
            address: {
                street: profileForm.street,
                city: profileForm.city,
                state: profileForm.state,
                postalCode: profileForm.postalCode,
                country: 'Pakistan',
            },
        });

        if (result.success) {
            showSuccess('Profile updated');
            setIsEditing(false);
        } else {
            showError(result.message || 'Failed to update profile');
        }
        setSaving(false);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold text-foreground">Profile Information</h2>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-lg">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-lg">
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="rounded-lg">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        {isEditing ? (
                            <Input
                                value={profileForm.name}
                                onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                className="h-12 rounded-xl"
                            />
                        ) : (
                            <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">{customer.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        {isEditing ? (
                            <Input
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                placeholder="+92 300 1234567"
                                className="h-12 rounded-xl"
                            />
                        ) : (
                            <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">
                                {customer.phone || <span className="text-muted-foreground">Not set</span>}
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                    <h3 className="font-medium text-foreground mb-4">Default Address</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="sm:col-span-2 space-y-2">
                            <Label>Street Address</Label>
                            {isEditing ? (
                                <Input
                                    value={profileForm.street}
                                    onChange={(e) => setProfileForm(p => ({ ...p, street: e.target.value }))}
                                    placeholder="123 Main Street"
                                    className="h-12 rounded-xl"
                                />
                            ) : (
                                <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">
                                    {customer.address?.street || <span className="text-muted-foreground">Not set</span>}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>City</Label>
                            {isEditing ? (
                                <Input
                                    value={profileForm.city}
                                    onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))}
                                    placeholder="Karachi"
                                    className="h-12 rounded-xl"
                                />
                            ) : (
                                <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">
                                    {customer.address?.city || <span className="text-muted-foreground">Not set</span>}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>State/Province</Label>
                            {isEditing ? (
                                <Input
                                    value={profileForm.state}
                                    onChange={(e) => setProfileForm(p => ({ ...p, state: e.target.value }))}
                                    placeholder="Sindh"
                                    className="h-12 rounded-xl"
                                />
                            ) : (
                                <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">
                                    {customer.address?.state || <span className="text-muted-foreground">Not set</span>}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Postal Code</Label>
                            {isEditing ? (
                                <Input
                                    value={profileForm.postalCode}
                                    onChange={(e) => setProfileForm(p => ({ ...p, postalCode: e.target.value }))}
                                    placeholder="75500"
                                    className="h-12 rounded-xl"
                                />
                            ) : (
                                <p className="h-12 px-3 py-2.5 bg-muted/30 rounded-xl text-foreground">
                                    {customer.address?.postalCode || <span className="text-muted-foreground">Not set</span>}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
