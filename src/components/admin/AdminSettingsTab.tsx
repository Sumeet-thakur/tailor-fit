import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import { UserCog, Upload, User, Activity, Database, Loader2, Video, X, Box, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { settingsService, SiteSettings } from '@/services/settingsService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getAdminProfileFolder } from '@/lib/cloudinaryFolders';

export function AdminSettingsTab() {
    const { admin, token, isSuperAdmin, updateAdmin } = useAuth();

    const [profileForm, setProfileForm] = useState({
        name: '',
        profileImage: ''
    });
    const [imageUploadLoading, setImageUploadLoading] = useState(false);
    const [reconLoading, setReconLoading] = useState(false);

    // Site Settings State
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [videoUploading, setVideoUploading] = useState(false);

    // Initialize profile form when admin data loads
    useEffect(() => {
        if (admin) {
            setProfileForm({
                name: admin.name || '',
                profileImage: (admin as any).profileImage || ''
            });
        }
    }, [admin]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsService.getSettings();
                setSiteSettings(data);
            } catch (err) {}
        };
        fetchSettings();
    }, []);

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploadLoading(true);
        const dismissLoading = showLoading('Uploading profile image...');
        const formData = new FormData();
        // Per-admin profile folder: admins/{adminId}/profile
        const adminId = (admin as any)?._id || '';
        const profileFolder = getAdminProfileFolder(adminId, admin?.name);
        formData.append('folder', profileFolder);
        // Static name forces Cloudinary to overwrite the existing file
        formData.append('custom_public_id', 'profile');

        // IMPORTANT: Append file AFTER text boundaries so Multer parses correctly
        formData.append('image', file);

        try {
            if (!token || token === 'legacy-token') {
                throw new Error('Authentication required');
            }
            const data = await adminService.uploadFile(formData, token);
            if (data.path) {
                setProfileForm(prev => ({ ...prev, profileImage: data.path }));
                showSuccess('Profile image updated');
            } else {
                throw new Error('Upload failed - no path returned');
            }
        } catch (error) {
            const apiError = error as ApiError;
            console.error('Upload error:', apiError);
            showError(apiError.message || 'Failed to upload image');
        } finally {
            setImageUploadLoading(false);
            dismissLoading();
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileForm)
            });

            const data = await response.json();
            if (data.success) {
                updateAdmin({
                    name: data.data.name,
                    profileImage: data.data.profileImage,
                });
                showSuccess('Profile updated successfully');
            } else {
                showError(data.message || 'Update failed');
            }
        } catch (error) {
            showError('Failed to update profile');
        }
    };

    const handleReconciliation = async () => {
        if (!confirm('This will scan thousands of files in Cloudinary and permanently delete orphans. Are you sure you want to proceed?')) return;
        setReconLoading(true);
        const dismiss = showLoading('Scanning Cloudinary DB for orphans...');
        try {
            const response = await fetch('/api/admin/reconcile-cloudinary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                const { orphansFound, assetsDeleted, spaceSavedBytes } = data.data;
                const savedMB = (spaceSavedBytes / (1024 * 1024)).toFixed(2);
                showSuccess(`Reconciliation Complete! Cleaned ${assetsDeleted}/${orphansFound} orphans saving ${savedMB} MB.`);
            } else {
                showError(data.error || data.message || 'Reconciliation failed');
            }
        } catch (error) {
            console.error('Recon error:', error);
            showError('Network error during reconciliation');
        } finally {
            setReconLoading(false);
            dismiss();
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.includes('video/')) {
            showError('Please select a valid video file (.mp4, .webm)');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            showError('Video must be less than 100MB');
            return;
        }

        setVideoUploading(true);
        const dismissLoading = showLoading('Uploading video...');
        
        try {
            const formData = new FormData();
            formData.append('image', file); // upload middleware expects 'image'
            
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            
            setSiteSettings(prev => ({ ...prev, homepageCtaVideoUrl: data.path }));
            showSuccess('Video uploaded! Click Save Site Settings to apply.');
        } catch (err: any) {
            showError(err.message || 'Error uploading video');
        } finally {
            setVideoUploading(false);
            dismissLoading();
            // Reset input so the same file can be selected again
            e.target.value = '';
        }
    };

    const handleSaveSiteSettings = async () => {
        setSettingsLoading(true);
        const dismiss = showLoading('Saving settings...');
        try {
            if (!token) throw new Error('Authentication required');
            const res = await settingsService.updateSettings({
                homepageCtaVideoUrl: siteSettings.homepageCtaVideoUrl,
                is2DEnabled: siteSettings.is2DEnabled
            }, token);
            if (res.success && res.settings) {
                setSiteSettings(res.settings);
                showSuccess('Global settings updated');
            } else {
                showError(res.error || 'Failed to save');
            }
        } catch (err) {
            showError('Save failed');
        } finally {
            setSettingsLoading(false);
            dismiss();
        }
    };

    const handleToggle2D = async (checked: boolean) => {
        const prevValue = siteSettings.is2DEnabled ?? true;
        setSiteSettings(prev => ({ ...prev, is2DEnabled: checked }));

        try {
            if (!token) throw new Error('Authentication required');
            const res = await settingsService.updateSettings({ is2DEnabled: checked }, token);
            
            if (res.success && res.settings) {
                setSiteSettings(prev => ({ ...prev, is2DEnabled: res.settings!.is2DEnabled }));
                showSuccess(`2D Products ${checked ? 'enabled' : 'disabled'} globally`);
            } else {
                setSiteSettings(prev => ({ ...prev, is2DEnabled: prevValue }));
                showError(res.error || 'Failed to update 2D setting');
            }
        } catch (err) {
            setSiteSettings(prev => ({ ...prev, is2DEnabled: prevValue }));
            showError('Failed to update 2D setting');
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-primary" /> Account Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your admin profile</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                    {/* Profile Image */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-muted/50 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                                {profileForm.profileImage ? (
                                    <img src={profileForm.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-muted-foreground/50" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors">
                                <Upload className="w-4 h-4 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleProfileImageUpload}
                                    disabled={imageUploadLoading}
                                />
                            </label>
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{admin?.name}</p>
                            <p className="text-sm text-muted-foreground">{admin?.email}</p>
                            {isSuperAdmin && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                    Super Admin
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="admin-name">Name</Label>
                        <Input
                            id="admin-name"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className="h-12 rounded-xl"
                        />
                    </div>

                    {/* Email Field (Read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                            id="admin-email"
                            value={admin?.email || ''}
                            disabled
                            className="h-12 rounded-xl bg-muted/50"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-xl">
                        Save Changes
                    </Button>
                </form>
            </div>

            {/* Global Site Settings Section */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Video className="w-5 h-5 text-primary" /> Global Site Settings
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Manage homepage assets and configurations</p>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">Homepage CTA Video</Label>
                        <p className="text-xs text-muted-foreground">
                            This video plays in the background of the bottom "Ready to Create Something Exceptional?" section.
                        </p>

                        {siteSettings.homepageCtaVideoUrl && siteSettings.homepageCtaVideoUrl !== '/videos/homepage_model.mp4' ? (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-black/5 border border-border group w-full">
                                <video 
                                    src={siteSettings.homepageCtaVideoUrl} 
                                    className="w-full h-full object-cover" 
                                    controls
                                    playsInline
                                    muted
                                    loop
                                />
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setSiteSettings(prev => ({ ...prev, homepageCtaVideoUrl: '/videos/homepage_model.mp4' }))}
                                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                        title="Revert to default"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center w-full">
                                <Video className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground font-medium">Using Default Video</p>
                                <p className="text-xs text-muted-foreground/70">(/videos/homepage_model.mp4)</p>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer">
                                <div className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2 ${videoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {videoUploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {videoUploading ? 'Uploading...' : 'Upload New Video'}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="video/mp4,video/webm,video/quicktime"
                                    onChange={handleVideoUpload}
                                    disabled={videoUploading}
                                />
                            </label>
                            
                            <Button 
                                onClick={handleSaveSiteSettings} 
                                disabled={settingsLoading || videoUploading}
                                className="gap-2"
                            >
                                {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Site Settings
                            </Button>
                        </div>

                        {/* 2D Products Toggle - Super Admin Only */}
                        {isSuperAdmin && (
                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Box className="w-4 h-4 text-primary" />
                                            <Label className="text-base font-semibold">Display 2D Products Globally</Label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Enable or disable the visibility of 2D products across the homepage, shop pages, and sliders.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={siteSettings.is2DEnabled ?? true}
                                        onCheckedChange={handleToggle2D}
                                    />
                                </div>
                                <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" />
                                    Note: Disabling this will hide 2D items for customers, but they will still be manageable in the admin products tab.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Storage Health Section (Super Admin Only) */}
            {isSuperAdmin && (
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden mt-8">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                                <Database className="w-5 h-5 text-red-500" /> Storage Health Check
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Securely destroy orphaned Cloudinary assets to prevent data bloat and reduce storage costs. Active files are strictly protected.
                            </p>
                        </div>
                        <Button
                            onClick={handleReconciliation}
                            disabled={reconLoading}
                            variant="destructive"
                            className="shrink-0 h-10 px-4 rounded-xl font-medium shadow-none hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 group"
                        >
                            {reconLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning...</>
                            ) : (
                                <><Activity className="w-4 h-4 mr-2 group-hover:animate-pulse" /> Reconcile Cloudinary</>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
