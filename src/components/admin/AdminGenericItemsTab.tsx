import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Upload, X, Layers } from 'lucide-react';
import { useCustomization as useShirt } from '@/context/CustomizationContext';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import { adminService } from '@/services/admin';
import type { ApiError } from '@/lib/apiClient';
import { collectGenericAddFormCloudinaryUrls, deleteCloudinaryUrlsFromAdmin } from '@/lib/adminCloudinaryCleanup';

interface AdminGenericItemsTabProps {
    activeTab: string;
    searchTerm?: string;
}

export function AdminGenericItemsTab({ activeTab, searchTerm }: AdminGenericItemsTabProps) {
    const { token } = useAuth();
    const {
        fabrics, options,
        addFabric, addCustomization, removeFabric, removeCustomization,
        updateFabric, updateCustomization,
    } = useShirt();

    const collars = options['collar'] || [];
    const cuffs = options['cuff'] || [];
    const pockets = options['chestpocket'] || [];
    const buttons = options['button'] || [];
    const sleeves = options['sleeve'] || [];
    const plackets = options['placket'] || [];
    const backs = options['back'] || [];
    const neckties = options['necktie'] || [];
    const bowties = options['bowtie'] || [];

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newImage, setNewImage] = useState('');
    const [newPreviewImage, setNewPreviewImage] = useState('');
    const [newFabricPreviews, setNewFabricPreviews] = useState<Record<string, string>>({});
    const [newBackFabricHalfPreviews, setNewBackFabricHalfPreviews] = useState<Record<string, string>>({});
    const [newBackFabricFullPreviews, setNewBackFabricFullPreviews] = useState<Record<string, string>>({});
    const [newCategory, setNewCategory] = useState<string>('collar');
    const [newColors, setNewColors] = useState<string[]>(['#FFFFFF']);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const fabricPreviewRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const genericAddFormInitialUrlsRef = useRef<Set<string>>(new Set());

    const resetForm = () => {
        setNewName(''); setNewImage(''); setNewPreviewImage('');
        setNewFabricPreviews({}); setNewBackFabricHalfPreviews({}); setNewBackFabricFullPreviews({});
        setNewColors(['#FFFFFF']); setEditingItem(null);
    };

    const uploadFile = async (file: File, folder: string = 'tailor-fit-uploads', customId?: string): Promise<string | null> => {
        const formData = new FormData();
        formData.append('folder', folder);
        if (customId) {
            const safeId = customId.replace(/[^a-zA-Z0-9-_\/]/g, '-');
            formData.append('custom_public_id', safeId);
        }
        formData.append('image', file);
        try {
            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
            const data = await adminService.uploadFile(formData, authToken);
            const path = data?.path ?? (data as { path?: string })?.path;
            return path || null;
        } catch (err: any) {
            console.error('[AdminGenericItems] Upload failed:', err);
            showError(err.message || 'Upload failed');
            return null;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPreview = false, fabricId?: string, variant?: 'half' | 'full') => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
        const contextLabel = activeTab === 'fabrics' ? 'fabric' : 'option';

        // Check existing URL for deletion
        let existingUrl: string | undefined;
        if (fabricId && variant === 'half') existingUrl = newBackFabricHalfPreviews[fabricId];
        else if (fabricId && variant === 'full') existingUrl = newBackFabricFullPreviews[fabricId];
        else if (fabricId) existingUrl = newFabricPreviews[fabricId];
        else if (isPreview) existingUrl = newPreviewImage;
        else existingUrl = newImage;

        let dismissLoading: (() => void) | null = null;
        if (existingUrl?.includes('cloudinary.com')) {
            dismissLoading = showLoading('Removing old image...');
            try {
                await adminService.deleteImageFromCloudinary(existingUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete old image:', err);
            } finally {
                dismissLoading?.();
            }
        }

        dismissLoading = showLoading(`Uploading ${contextLabel} image...`);
        try {
            const folder = activeTab === 'fabrics' ? 'fabrics' : 'options';
            let customId = '';
            if (activeTab === 'fabrics') {
                const fabricObj = fabricId ? fabrics.find(f => f.id === fabricId) : null;
                const rawName = fabricObj?.name || fabricId || newName || 'new-fabric';
                const fabricName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                let slotName = 'base';
                if (variant) slotName = `back-${variant}`;
                else if (isPreview) slotName = 'preview';
                customId = `fabrics/${fabricName}/${slotName}`;
            }

            const path = await uploadFile(file, folder, customId);
            if (!path) return;

            if (fabricId && variant === 'half') setNewBackFabricHalfPreviews(prev => ({ ...prev, [fabricId]: path }));
            else if (fabricId && variant === 'full') setNewBackFabricFullPreviews(prev => ({ ...prev, [fabricId]: path }));
            else if (fabricId) setNewFabricPreviews(prev => ({ ...prev, [fabricId]: path }));
            else if (isPreview) setNewPreviewImage(path);
            else setNewImage(path);

            showSuccess(`${contextLabel} image uploaded`);
        } finally {
            dismissLoading?.();
        }
    };

    const handleOpenAddDialog = () => {
        resetForm();
        genericAddFormInitialUrlsRef.current = new Set();
        setIsAddDialogOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setNewName(item.name);
        setNewImage(item.image);
        setNewPreviewImage(item.previewImage || '');
        setNewFabricPreviews(item.fabricPreviewImages || {});
        setNewBackFabricHalfPreviews(item.backHalfFabricPreviewImages || {});
        setNewBackFabricFullPreviews(item.backFullFabricPreviewImages || {});
        if (activeTab === 'fabrics') setNewColors(item.colors || ['#FFFFFF']);
        else setNewCategory(item.category);

        genericAddFormInitialUrlsRef.current = new Set(
            collectGenericAddFormCloudinaryUrls({
                newImage: item.image,
                newPreviewImage: item.previewImage,
                newFabricPreviews: item.fabricPreviewImages,
                newBackFabricHalfPreviews: item.backHalfFabricPreviewImages,
                newBackFabricFullPreviews: item.backFullFabricPreviewImages,
            })
        );
        setIsAddDialogOpen(true);
    };

    const handleGenericAddDialogClose = useCallback((open: boolean) => {
        if (!open) {
            const currentUrls = collectGenericAddFormCloudinaryUrls({
                newImage,
                newPreviewImage,
                newFabricPreviews,
                newBackFabricHalfPreviews,
                newBackFabricFullPreviews,
            });
            const initialUrls = genericAddFormInitialUrlsRef.current;
            const toDelete = currentUrls.filter((u) => !initialUrls.has(u));
            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

            if (toDelete.length && authToken) {
                deleteCloudinaryUrlsFromAdmin(toDelete, authToken);
            }
            resetForm();
        }
        setIsAddDialogOpen(open);
    }, [newImage, newPreviewImage, newFabricPreviews, newBackFabricHalfPreviews, newBackFabricFullPreviews, token]);

    const handleSaveItem = () => {
        if (!newName || !newImage) { showError('Please fill all required fields'); return; }

        if (editingItem) {
            if (activeTab === 'fabrics') {
                updateFabric(editingItem.id, { name: newName, image: newImage, previewImage: newPreviewImage || undefined, colors: newColors });
                showSuccess('Fabric updated');
            } else {
                updateCustomization(editingItem.id, editingItem.category, {
                    name: newName,
                    image: newImage,
                    previewImage: newPreviewImage || undefined,
                    fabricPreviewImages: newFabricPreviews,
                    backHalfFabricPreviewImages: newBackFabricHalfPreviews,
                    backFullFabricPreviewImages: newBackFabricFullPreviews,
                    category: newCategory as any
                });
                showSuccess('Option updated');
            }
        } else {
            if (activeTab === 'fabrics') {
                addFabric({ id: `f${Date.now()}`, name: newName, image: newImage, previewImage: newPreviewImage || undefined, colors: newColors });
                showSuccess('Fabric added');
            } else {
                addCustomization({
                    id: `${newCategory[0]}${Date.now()}`,
                    name: newName,
                    image: newImage,
                    previewImage: newPreviewImage || undefined,
                    fabricPreviewImages: newFabricPreviews,
                    backHalfFabricPreviewImages: newBackFabricHalfPreviews,
                    backFullFabricPreviewImages: newBackFabricFullPreviews,
                    category: newCategory as any
                });
                showSuccess('Option added');
            }
        }
        resetForm();
        setIsAddDialogOpen(false);
    };

    const handleDelete = async (id: string, category?: string, item?: any) => {
        if (activeTab === 'fabrics') {
            const urls: string[] = [];
            const add = (u: string | undefined) => { if (u?.includes('cloudinary.com')) urls.push(u); };
            if (item) {
                add(item.image); add(item.imageUrl); add(item.previewImage); add(item.backPreviewImage);
            } else {
                const fabric = fabrics.find((f) => f.id === id);
                if (fabric) {
                    add(fabric.image); add((fabric as any).imageUrl); add((fabric as any).previewImage); add((fabric as any).backPreviewImage);
                }
            }

            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
            if (urls.length > 0 && authToken) {
                const dismissLoading = showLoading('Removing images...');
                try {
                    await adminService.deleteImagesFromCloudinary(urls, authToken);
                } catch (err) {
                    console.error('[Admin] Failed to delete fabric images:', err);
                } finally {
                    dismissLoading();
                }
            }
            removeFabric(id);
            showSuccess('Fabric removed');
        } else if (category) {
            removeCustomization(id, category as any);
            showSuccess('Option removed');
        }
    };

    const getCurrentItems = () => {
        // We need to access the items based on activeTab.
        // In original code, it used `categories` list whic matched `allCategories`.
        // Here we can map activeTab to the context items manually or pass categories as prop.
        // Mapping manually is safer/contained.
        switch (activeTab) {
            case 'fabrics': return fabrics;
            case 'collar': return collars;
            case 'cuff': return cuffs;
            case 'chestpocket': return pockets;
            case 'button': return buttons;
            case 'sleeve': return sleeves;
            case 'back': return backs; // Assumes 'back' maps to backs
            case 'necktie': return neckties;
            case 'bowtie': return bowties;
            // Add other cases if needed
            default: return [];
        }
    };

    const currentItems = getCurrentItems();
    const filteredItems = searchTerm
        ? currentItems.filter((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        : currentItems;

    const addColor = () => setNewColors([...newColors, '#FFFFFF']);
    const updateColor = (i: number, c: string) => { const u = [...newColors]; u[i] = c; setNewColors(u); };
    const removeColor = (i: number) => setNewColors(newColors.filter((_, idx) => idx !== i));

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleOpenAddDialog} className="h-12 px-6 rounded-xl bg-gradient-luxury text-white shadow-soft hover:shadow-elevated transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Add {activeTab === 'fabrics' ? 'Fabric' : 'Option'}
                </Button>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-32">
                    <Layers className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-display text-xl font-medium">No {activeTab} items yet</h3>
                    <p className="text-muted-foreground">Add your first item to get started</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item: any, i: number) => (
                        <div key={item.id} className="group bg-white rounded-2xl border border-border/50 overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-500 animate-fade-up motion-reduce:animate-none" style={{ animationDelay: `${i * 0.06}s` }}>
                            <div className="relative aspect-square bg-muted/30">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Layers className="w-12 h-12 text-muted-foreground/30" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button size="sm" onClick={() => handleEdit(item)} className="rounded-lg"><Edit className="w-4 h-4 mr-1" />Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.category || (activeTab === 'fabrics' ? undefined : activeTab), item)} className="rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {item.previewImage && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Has Layer</span>}
                                    {item.category && <span className="text-xs text-muted-foreground capitalize">{item.category}</span>}
                                </div>
                                {item.colors && (
                                    <div className="flex gap-1 mt-3">
                                        {item.colors.slice(0, 6).map((c: string, ci: number) => (
                                            <div key={ci} className="w-5 h-5 rounded-full border border-border shadow-sm" style={{ backgroundColor: c }} />
                                        ))}
                                        {item.colors.length > 6 && <span className="text-xs text-muted-foreground">+{item.colors.length - 6}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Generic Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={handleGenericAddDialogClose}>
                <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
                    <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                        <div>
                            <DialogTitle className="font-display text-xl font-bold text-slate-900">{editingItem ? 'Edit' : 'Add'} {activeTab === 'fabrics' ? 'Fabric' : 'Option'}</DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">
                                {activeTab === 'fabrics' ? 'Add new fabric options for products.' : 'Add new customization options like collars, cuffs, etc.'}
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleGenericAddDialogClose(false)} className="rounded-full hover:bg-slate-100">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </Button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter name" className="h-12 rounded-xl" />
                            </div>
                            {activeTab !== 'fabrics' && (
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={newCategory} onValueChange={setNewCategory}>
                                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['collar', 'cuff', 'chestpocket', 'button', 'sleeve', 'back', 'necktie', 'bowtie'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Thumbnail Image *</Label>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-4 h-4 mr-2" />Upload Thumbnail
                                </Button>
                                {newImage && <img src={newImage} alt="" className="h-24 w-full object-cover rounded-xl mt-2 border" />}
                            </div>
                            <div className="space-y-2">
                                <Label>Preview Layer (Overlay)</Label>
                                <input ref={previewInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => previewInputRef.current?.click()}>
                                    <Upload className="w-4 h-4 mr-2" />Upload Layer
                                </Button>
                                {newPreviewImage && <img src={newPreviewImage} alt="" className="h-24 w-full object-contain rounded-xl mt-2 border bg-muted/30" />}
                            </div>
                            {activeTab === 'fabrics' && (
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Colors</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {newColors.map((color, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <input type="color" value={color} onChange={(e) => updateColor(i, e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                                                {newColors.length > 1 && <button onClick={() => removeColor(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3 h-3" /></button>}
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={addColor} className="rounded-lg"><Plus className="w-3 h-3" /></Button>
                                    </div>
                                </div>
                            )}
                            {activeTab !== 'fabrics' && activeTab !== 'backs' && (
                                <div className="space-y-4 md:col-span-2 p-4 bg-muted/30 rounded-2xl">
                                    <Label className="text-base font-semibold">Fabric-Specific Previews</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {fabrics.map(fabric => (
                                            <div key={fabric.id} className="p-3 bg-white rounded-xl border border-border/50 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {fabric.image && <img src={fabric.image} alt="" className="w-6 h-6 rounded-full object-cover" />}
                                                    <span className="text-sm font-medium">{fabric.name}</span>
                                                </div>
                                                <input ref={el => { if (el) fabricPreviewRefs.current[fabric.id] = el; }} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false, fabric.id)} className="hidden" />
                                                <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => fabricPreviewRefs.current[fabric.id]?.click()}>
                                                    <Upload className="w-3 h-3 mr-1" />Upload
                                                </Button>
                                                {newFabricPreviews[fabric.id] && (
                                                    <div className="relative">
                                                        <img src={newFabricPreviews[fabric.id]} alt="" className="h-16 w-full object-contain rounded border bg-muted/30" />
                                                        <button onClick={() => { const u = { ...newFabricPreviews }; delete u[fabric.id]; setNewFabricPreviews(u); }} className="absolute top-1 right-1 p-0.5 bg-destructive text-white rounded">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => handleGenericAddDialogClose(false)} className="rounded-xl h-12 px-6">Cancel</Button>
                        <Button onClick={handleSaveItem} className="rounded-xl bg-gradient-luxury text-white h-12 px-8">
                            {editingItem ? 'Save Changes' : `Add ${activeTab === 'fabrics' ? 'Fabric' : 'Option'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
