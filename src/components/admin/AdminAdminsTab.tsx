import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { showSuccess, showError } from '@/lib/toastHelpers';
import { Shield, Plus, Ban, CheckCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

interface AdminData {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
    isActive: boolean;
    profileImage?: string;
    lastLogin?: string;
    createdAt?: string;
}

interface AdminAdminsTabProps {
    searchTerm: string;
}

export function AdminAdminsTab({ searchTerm }: AdminAdminsTabProps) {
    const { admin, token, isSuperAdmin } = useAuth();

    const [admins, setAdmins] = useState<AdminData[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [isAdminCreationOpen, setIsAdminCreationOpen] = useState(false);
    const [newAdminData, setNewAdminData] = useState({ name: '', email: '', password: '', inviteCode: '' });

    const handleLogout = useCallback(() => {
        // Minimal — just for error handling redirect (parent handles real logout)
    }, []);

    const fetchAdmins = useCallback(async () => {
        if (!token || token === 'legacy-token' || !isSuperAdmin) return;
        setAdminsLoading(true);
        try {
            const data = await adminService.getAdmins(token);
            setAdmins(data);
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.status === 401) {
                showError('Session expired. Please login again.');
                handleLogout();
                return;
            }
            console.error('[Admin] fetchAdmins error:', apiError.message);
            showError(apiError.message || 'Failed to load admins');
        } finally {
            setAdminsLoading(false);
        }
    }, [token, isSuperAdmin, handleLogout]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleCreateAdmin = async () => {
        try {
            if (!newAdminData.name || !newAdminData.email || !newAdminData.password) {
                showError('Please fill in all fields');
                return;
            }
            await adminService.createAdmin(
                newAdminData.name,
                newAdminData.email,
                newAdminData.password,
                newAdminData.inviteCode || '',
                token
            );
            showSuccess('Admin created successfully');
            setIsAdminCreationOpen(false);
            setNewAdminData({ name: '', email: '', password: '', inviteCode: '' });
            fetchAdmins();
        } catch (error) {
            const apiError = error as ApiError;
            showError(apiError.message || 'An error occurred');
        }
    };

    const toggleAdminStatus = async (adminId: string, activate: boolean) => {
        if (!token || token === 'legacy-token') {
            showError('Admin authentication required');
            return;
        }
        try {
            const endpoint = activate ? 'activate' : 'deactivate';
            const res = await fetch(`/api/admin/${adminId}/${endpoint}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${endpoint} admin`);
            showSuccess(`Admin ${activate ? 'activated' : 'deactivated'} successfully`);
            fetchAdmins();
        } catch (err: any) {
            showError(err.message);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="text-center py-32">
                <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-medium">Super Admin Access Required</h3>
                <p className="text-muted-foreground">Only super admins can manage other admin accounts</p>
            </div>
        );
    }

    if (adminsLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    if (admins.length === 0) {
        return (
            <div className="text-center py-32">
                <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-medium">No admins found</h3>
                <p className="text-muted-foreground">Share the invite code to add more admins</p>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg inline-block">
                    <code className="text-primary font-mono text-sm">TAILORFIT-ADMIN-2026</code>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-display font-semibold text-foreground">Admin Team</h3>
                    <p className="text-sm text-muted-foreground">Manage administrative access to the platform</p>
                </div>
                <Button onClick={() => setIsAdminCreationOpen(true)} className="rounded-full shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Admin
                </Button>
            </div>

            <Dialog open={isAdminCreationOpen} onOpenChange={setIsAdminCreationOpen}>
                <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
                    <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                        <div>
                            <DialogTitle className="font-display text-2xl font-bold text-slate-900">Create New Admin</DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">Create a new administrator account with specific privileges.</DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsAdminCreationOpen(false)} className="rounded-full hover:bg-slate-100">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </Button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-border/50 space-y-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></Label>
                                <Input
                                    value={newAdminData.name}
                                    onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="h-11 rounded-xl bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></Label>
                                <Input
                                    type="email"
                                    value={newAdminData.email}
                                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                                    placeholder="admin@example.com"
                                    className="h-11 rounded-xl bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">Password <span className="text-red-500">*</span></Label>
                                <Input
                                    type="password"
                                    value={newAdminData.password}
                                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                                    placeholder="Min. 8 characters"
                                    className="h-11 rounded-xl bg-white"
                                />
                            </div>
                        </div>

                        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50 space-y-2">
                            <Label className="font-semibold text-amber-800">Invite Code (Optional)</Label>
                            <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-3 h-11">
                                <Key className="w-4 h-4 text-amber-500 shrink-0" />
                                <Input
                                    value={newAdminData.inviteCode}
                                    onChange={(e) => setNewAdminData({ ...newAdminData, inviteCode: e.target.value })}
                                    placeholder="e.g. TAILORFIT-ADMIN-2026"
                                    className="border-none bg-transparent h-full px-0 focus-visible:ring-0 placeholder:text-amber-300 text-amber-900"
                                />
                            </div>
                            <p className="text-xs text-amber-600/70">Leave blank if not required.</p>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsAdminCreationOpen(false)} className="h-12 px-6 rounded-xl border-slate-300 text-slate-700 hover:bg-white hover:text-slate-900 font-medium">Cancel</Button>
                        <Button onClick={handleCreateAdmin} className="h-12 px-8 rounded-xl bg-primary text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all font-medium">Create Admin</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.filter(a => !searchTerm ||
                    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((adminItem, i) => (
                    <div key={adminItem._id} className="bg-white p-5 rounded-2xl border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-500 animate-fade-up motion-reduce:animate-none flex flex-col justify-between gap-4 group" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 ${adminItem.role === 'super_admin' ? 'border-amber-100 bg-amber-50' : 'border-primary/10 bg-primary/5'
                                    }`}>
                                    {adminItem.profileImage ? (
                                        <img src={adminItem.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Shield className={`w-5 h-5 ${adminItem.role === 'super_admin' ? 'text-amber-600' : 'text-primary'}`} />
                                    )}
                                </div>
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${adminItem.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary/5 text-primary'
                                    }`}>
                                    {adminItem.role?.replace('_', ' ')}
                                </span>
                            </div>

                            <h4 className="font-semibold text-foreground text-lg truncate">{adminItem.name}</h4>
                            <p className="text-sm text-muted-foreground truncate mb-4">{adminItem.email}</p>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                                <span className={`w-2 h-2 rounded-full ${adminItem.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="font-medium">{adminItem.isActive ? 'Active' : 'Account Disabled'}</span>
                            </div>
                        </div>

                        {adminItem._id !== admin?._id && adminItem.role !== 'super_admin' && (
                            <div className="pt-2">
                                <Button
                                    variant={adminItem.isActive ? 'outline' : 'default'}
                                    size="sm"
                                    onClick={() => toggleAdminStatus(adminItem._id, !adminItem.isActive)}
                                    className={`w-full rounded-xl h-9 ${adminItem.isActive ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    {adminItem.isActive ? (
                                        <><Ban className="w-3.5 h-3.5 mr-2" /> Deactivate Access</>
                                    ) : (
                                        <><CheckCircle className="w-3.5 h-3.5 mr-2" /> Activate Access</>
                                    )}
                                </Button>
                            </div>
                        )}
                        {adminItem._id === admin?._id && (
                            <div className="pt-2 text-center text-xs text-muted-foreground italic bg-muted/30 py-2 rounded-xl">
                                Current Session
                            </div>
                        )}
                        {(adminItem.role === 'super_admin' && adminItem._id !== admin?._id) && (
                            <div className="pt-2 text-center text-xs text-amber-600/70 italic bg-amber-50/50 py-2 rounded-xl">
                                Super Admin Access
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
