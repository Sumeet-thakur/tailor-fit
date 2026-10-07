import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/lib/formatPrice';
import { adminService } from '@/services/admin';
import { productService } from '@/services/products';
import { ApiError } from '@/lib/apiClient';
import {
    Plus, Trash2, Edit, Upload, Layers, Monitor,
    Package, Search, Sparkles, Box, FileText, Palette, X, ArrowUp, ArrowDown
} from 'lucide-react';
import { showSuccess, showError, showInfo, showLoading } from '@/lib/toastHelpers';
import { Product } from '@/types/product';
import type { Fabric3D, FabricCategory } from '@/types/fabric';
import { getFabricThumbnailUrl } from '@/services/fabricService';
import { getImageUrl, getMediumThumbnailUrl } from '@/utils/imageHelper';
import { OptimizedImage } from '@/components/common/OptimizedImage';
// fabricSwatchRenderer is lazy-loaded via dynamic import() to avoid pulling in Three.js (1.6 MB) on initial load
import {
    idSlug,
    slugify,
    getProductImageFolderAndId,
    getProductFabricPreviewFolderAndId,
    getProductFabricFolderAndId,
    getProductOptionFolderAndId,
    getProductOptionVariantFolderAndId,
    getProduct3DTextureMapFolderAndId,
    getProductAssetsFolder,
    getProductFolderPrefix,
} from '@/lib/cloudinaryFolders';
import {
    collectProductFormCloudinaryUrls,
    collect3DFabricFormCloudinaryUrls,
    deleteCloudinaryUrlsFromAdmin,
} from '@/lib/adminCloudinaryCleanup';

interface AdminProductsTabProps {
    searchTerm: string;
    onProductsChange?: () => void;
}

export function AdminProductsTab({ searchTerm, onProductsChange }: AdminProductsTabProps) {
    const { token } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState('');

    // Generate a valid 24-character hex string for MongoDB ObjectId
    const generateObjectId = () => {
        const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
        return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16)).toLowerCase();
    };

    // Product Form State
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    const [productForm, setProductForm] = useState<any>({
        _id: '', name: '', description: '', categoryType: '2d', category: 'shirt', basePrice: 0,
        images: {
            baseImage: '', backImage: '', thumbnailImage: '',
            fabricPreviewThumbnails: [], gallery: [],
            galleryByFabric: {}
        },
        customizationOptions: { fabrics: [], optionGroups: [] },
        fabricIds: [], modelUrl: '', environmentMapUrl: '',
        showInHeroSlider: false, heroSliderOrder: 0, heroSliderCount: 1,
    });

    const resetProductForm = useCallback(() => {
        setProductForm({
            _id: generateObjectId(), name: '', description: '', categoryType: '2d', category: 'shirt', basePrice: 0,
            images: {
                baseImage: '', backImage: '', thumbnailImage: '',
                fabricPreviewThumbnails: [], gallery: [],
                galleryByFabric: {}
            },
            customizationOptions: { fabrics: [], optionGroups: [] },
            fabricIds: [], modelUrl: '', environmentMapUrl: '',
            showInHeroSlider: false, heroSliderOrder: 0, heroSliderCount: 1,
        });
        productFormInitialUrlsRef.current = new Set();
    }, []);

    const productFormInitialUrlsRef = useRef<Set<string>>(new Set());

    // Refs for file inputs
    const productBaseRef = useRef<HTMLInputElement>(null);

    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    // 3D Fabrics State
    const [fabrics3D, setFabrics3D] = useState<Fabric3D[]>([]);
    const [fabrics3DLoading, setFabrics3DLoading] = useState(false);
    const fabrics3DFetchedRef = useRef(false); // Track if 3D fabrics have been fetched (lazy load)
    const [is3DFabricDialogOpen, setIs3DFabricDialogOpen] = useState(false);
    const [editing3DFabric, setEditing3DFabric] = useState<Fabric3D | null>(null);
    const [fabric3DForm, setFabric3DForm] = useState({
        name: '', category: 'cotton' as FabricCategory, colorMapUrl: '', normalMapUrl: '', roughnessMapUrl: '',
        baseColor: '#FFFFFF', roughness: 0.8, metalness: 0.0, normalScale: 1.0, price: 0, thumbnailUrl: '',
        _tempId: ''
    });
    const fabric3DFormInitialUrlsRef = useRef<Set<string>>(new Set());

    // Global Image Preview Modal State
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Variant Manager State inside Option Group
    const [activeVariantOption, setActiveVariantOption] = useState<{ gi: number; oi: number } | null>(null);
    // View Manager State (for front-only, back-only, front-back variant types)
    const [activeViewOption, setActiveViewOption] = useState<{ gi: number; oi: number } | null>(null);
    const [selectedFabricIdForGallery, setSelectedFabricIdForGallery] = useState<string>('');

    const handleVariantImageUpload = async (file: File, fabricId: string, view: 'front' | 'back' = 'front') => {
        if (!activeVariantOption) return;
        const { gi, oi } = activeVariantOption;

        try {
            const dimiss = showLoading(`Uploading ${view} variant...`);
            // Build structured path: products/{type}/{slug}/options/{group}/{option}/variants/{fabric}/{view}
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const group = productForm.customizationOptions?.optionGroups?.[gi];
            const option = group?.options?.[oi];
            const groupId = group?.id || 'option-group';
            const groupLabel = group?.label || group?.name;
            const optionId = option?.id || 'option';
            const optionLabel = option?.name;
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';

            // {id}-{slug} at every dynamic entity level for browsability + immutability
            const fabric = productForm.customizationOptions?.fabrics?.find((f: any) => f.id === fabricId);
            const { folder, customId } = getProductOptionVariantFolderAndId(
                productSlug, groupId, groupLabel, optionId, optionLabel, fabricId, fabric?.name, view, file.name, categoryType, productForm._id
            );

            // Delete old variant image for this view if replacing
            const existing = option?.layersByFabric?.[fabricId];
            const oldUrl = typeof existing === 'string'
                ? (view === 'front' ? existing : undefined)
                : existing?.[view];
            if (oldUrl?.includes('cloudinary.com')) {
                const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
                try { await adminService.deleteImageFromCloudinary(oldUrl, authToken); }
                catch (err) { console.error('[Admin] Failed to delete old variant image:', err); }
            }

            const path = await uploadFile(file, folder, customId);
            dimiss();

            if (path) {
                setProductForm((prev: any) => {
                    const newGroups = [...prev.customizationOptions.optionGroups];
                    const group = { ...newGroups[gi] };
                    const options = [...group.options];
                    const option = { ...options[oi] };

                    const layers = { ...(option.layersByFabric || {}) };
                    // Always store as { front, back } object
                    const prev_entry = layers[fabricId];
                    const obj = typeof prev_entry === 'string'
                        ? { front: prev_entry, [view]: path }
                        : { ...(prev_entry || {}), [view]: path };
                    layers[fabricId] = obj;

                    option.layersByFabric = layers;
                    options[oi] = option;
                    group.options = options;
                    newGroups[gi] = group;

                    return {
                        ...prev,
                        customizationOptions: {
                            ...prev.customizationOptions,
                            optionGroups: newGroups
                        }
                    };
                });
                showSuccess(`${view.charAt(0).toUpperCase() + view.slice(1)} variant uploaded`);
            }
        } catch (e) {
            showError('Upload failed');
        }
    };

    const removeVariantImage = async (fabricId: string, view: 'front' | 'back') => {
        if (!activeVariantOption) return;
        const { gi, oi } = activeVariantOption;

        const group = productForm.customizationOptions?.optionGroups?.[gi];
        const option = group?.options?.[oi];
        const existingVariant = option?.layersByFabric?.[fabricId];
        const oldUrl = typeof existingVariant === 'string' ? (view === 'front' ? existingVariant : undefined) : existingVariant?.[view];

        if (oldUrl?.includes('cloudinary.com') && token && token !== 'legacy-token') {
            const dismiss = showLoading(`Removing ${view} variant...`);
            try {
                await adminService.deleteImageFromCloudinary(oldUrl, token);
            } catch (err) {
                console.error('[Admin] Failed to delete variant from Cloudinary:', err);
            } finally {
                dismiss();
            }
        }

        setProductForm((prev: any) => {
            const newGroups = [...prev.customizationOptions.optionGroups];
            const g = { ...newGroups[gi] };
            const options = [...g.options];
            const opt = { ...options[oi] };

            const layers = { ...(opt.layersByFabric || {}) };
            const existing = layers[fabricId];
            if (typeof existing === 'object' && existing) {
                const updated = { ...existing };
                delete updated[view];
                if (!updated.front && !updated.back) {
                    delete layers[fabricId];
                } else {
                    layers[fabricId] = updated;
                }
            } else {
                if (view === 'front') delete layers[fabricId];
            }

            opt.layersByFabric = layers;
            options[oi] = opt;
            g.options = options;
            newGroups[gi] = g;

            return {
                ...prev,
                customizationOptions: {
                    ...prev.customizationOptions,
                    optionGroups: newGroups
                }
            };
        });
    };

    // Simple front/back upload (no fabric variants — uses layersByView)
    const handleViewImageUpload = async (gi: number, oi: number, view: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const dismiss = showLoading(`Uploading ${view} image...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const group = productForm.customizationOptions?.optionGroups?.[gi];
            const option = group?.options?.[oi];
            const groupId = group?.id || 'option-group';
            const groupLabel = group?.label || group?.name;
            const optionId = option?.id || 'option';
            const optionLabel = option?.name;
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
            const { folder, customId } = getProductOptionVariantFolderAndId(
                productSlug, groupId, groupLabel, optionId, optionLabel, view, undefined, view, file.name, categoryType, productForm._id
            );

            // Delete old image if replacing
            const oldUrl = option?.layersByView?.[view];
            if (oldUrl?.includes('cloudinary.com')) {
                const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
                try { await adminService.deleteImageFromCloudinary(oldUrl, authToken); }
                catch (err) { console.error('[Admin] Failed to delete old view image:', err); }
            }

            const path = await uploadFile(file, folder, customId);
            dismiss();

            if (path) {
                setProductForm((prev: any) => {
                    const newGroups = [...prev.customizationOptions.optionGroups];
                    const g = { ...newGroups[gi] };
                    const options = [...g.options];
                    const opt = { ...options[oi] };
                    opt.layersByView = { ...(opt.layersByView || {}), [view]: path };
                    options[oi] = opt;
                    g.options = options;
                    newGroups[gi] = g;
                    return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: newGroups } };
                });
                showSuccess(`${view.charAt(0).toUpperCase() + view.slice(1)} image uploaded`);
            }
        } catch {
            showError('Upload failed');
        } finally {
            dismiss?.();
        }
    };

    const removeViewImage = async (gi: number, oi: number, view: 'front' | 'back') => {
        const option = productForm.customizationOptions?.optionGroups?.[gi]?.options?.[oi];
        const oldUrl = option?.layersByView?.[view];

        if (oldUrl?.includes('cloudinary.com') && token && token !== 'legacy-token') {
            const dismiss = showLoading(`Removing ${view} image...`);
            try {
                await adminService.deleteImageFromCloudinary(oldUrl, token);
            } catch (err) {
                console.error('[Admin] Failed to delete view image:', err);
            } finally {
                dismiss();
            }
        }

        setProductForm((prev: any) => {
            const newGroups = [...prev.customizationOptions.optionGroups];
            const g = { ...newGroups[gi] };
            const options = [...g.options];
            const opt = { ...options[oi] };
            const views = { ...(opt.layersByView || {}) };
            delete views[view];
            opt.layersByView = views;
            options[oi] = opt;
            g.options = options;
            newGroups[gi] = g;
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: newGroups } };
        });
    };

    const uploadFile = async (file: File, folder: string = 'tailor-fit-uploads', customId?: string): Promise<string | null> => {
        const formData = new FormData();
        formData.append('folder', folder);
        if (customId) {
            // Keep alphanumeric, dash, underscore, and forward slash for nested paths
            const safeId = customId.replace(/[^a-zA-Z0-9-_/]/g, '-');
            formData.append('custom_public_id', safeId);
        }
        formData.append('image', file);
        try {
            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
            // Use adminService.uploadFile which exists in admin service but needs to be checked if it matches signature
            // actually adminService.uploadFile takes formData and token.
            const data = await adminService.uploadFile(formData, authToken);
            const path = data?.path ?? (data as { path?: string })?.path;
            return path || null;
        } catch (err: any) {
            console.error('[AdminDashboard] Upload failed:', err);
            showError(err.message || 'Upload failed');
            return null;
        }
    };

    const productCategories = [
        { id: 'shirt', label: 'Dress Shirts' },
        { id: 'suit', label: 'Suits' },
        { id: 'pants', label: 'Dress Pants' },
        { id: 'blazer', label: 'Blazers' },
        { id: 'vest', label: 'Vests' },
        { id: 'tuxedo', label: 'Tuxedos' },
    ];

    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError('');
        try {
            const data = await productService.getAll();
            setProducts(data);
            // Note: onProductsChange is called explicitly after CRUD operations (save/delete),
            // NOT here, to avoid redundant parent badge-count refetch on initial mount.
        } catch (err) {
            const apiError = err as ApiError;
            setProductsError(apiError.message || 'Failed to load products');
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const fetch3DFabrics = useCallback(async () => {
        setFabrics3DLoading(true);
        try {
            const data = await adminService.getFabrics();
            setFabrics3D(data.map((f) => ({
                ...f,
                category: (f.category ?? 'cotton') as FabricCategory,
                colorMapUrl: f.colorMapUrl ?? '',
                baseColor: (f.baseColor ?? '#FFFFFF') as string,
                roughness: (f.roughness ?? 0.8) as number,
                metalness: (f.metalness ?? 0) as number,
                normalScale: (f.normalScale ?? 1) as number,
                isActive: (f.isActive ?? true) as boolean,
            })));
        } catch (err) {
            const apiError = err as ApiError;
            showError(apiError.message || 'Failed to load 3D fabrics');
        } finally {
            setFabrics3DLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        // 3D fabrics are fetched lazily when the product dialog opens (see handleOpenProductDialog)
        // This prevents Three.js (1.6 MB) and 30+ 3D textures from loading on initial page view
    }, [fetchProducts]);

    // Product CRUD Handlers

    const handleOpenProductDialog = (product?: Product) => {
        // Lazy-load 3D fabrics on first dialog open (prevents Three.js + 30 textures on initial page view)
        if (!fabrics3DFetchedRef.current) {
            fabrics3DFetchedRef.current = true;
            fetch3DFabrics();
        }

        if (product) {
            setProductForm({
                ...product,
                categoryType: product.categoryType || '2d',
                customizationOptions: {
                    fabrics: product.customizationOptions?.fabrics || [],
                    optionGroups: product.customizationOptions?.optionGroups || [],
                },
                fabricIds: product.fabricIds || [],
                modelUrl: product.modelUrl || '',
                environmentMapUrl: product.environmentMapUrl || '',
                showInHeroSlider: product.showInHeroSlider ?? false,
                heroSliderOrder: product.heroSliderOrder ?? 0,
                heroSliderCount: product.heroSliderCount ?? 1,
            });
            productFormInitialUrlsRef.current = new Set(collectProductFormCloudinaryUrls(product));
        } else {
            resetProductForm();
        }
        setIsProductDialogOpen(true);
    };

    const handleProductDialogClose = (open: boolean) => {
        if (!open) {
            const currentUrls = collectProductFormCloudinaryUrls(productForm);
            const initialUrls = productFormInitialUrlsRef.current;
            const toDelete = currentUrls.filter((u) => !initialUrls.has(u));
            if (toDelete.length && token && token !== 'legacy-token') {
                deleteCloudinaryUrlsFromAdmin(toDelete, token);
            }
            // Do not immediately reset here if we want to preserve state while closing,
            // but since it's unmounting, resetting is clean. 
            // We can just rely on handleOpenProductDialog to initialize it next time.
        }
        setIsProductDialogOpen(open);
    };

    const handleProductSave = async () => {
        if (!productForm.name || !productForm.description) {
            showError('Please fill all required fields');
            return;
        }
        if (!token || token === 'legacy-token') {
            showError('Please log in as admin to create or update products');
            return;
        }
        try {
            const base = { ...productForm, basePrice: Number(productForm.basePrice || 0) };

            // If the product doesn't exist in our current `products` list, it's a creation event 
            // even though it already has a drafted `_id` string.
            const isUpdate = products.some(p => p._id === base._id);
            const payload = base;

            if (isUpdate) {
                await productService.update(productForm._id, payload, token);
            } else {
                await productService.create(payload, token);
            }

            showSuccess(isUpdate ? 'Product updated' : 'Product created');
            setIsProductDialogOpen(false);
            fetchProducts();
            onProductsChange?.();
        } catch (err: any) {
            const errMsg = err.message || 'Failed to save product';
            const isDuplicate = /already exists|duplicate|E11000/i.test(errMsg);
            showError(isDuplicate ? 'A product with this name or slug already exists. Please use a different name.' : errMsg);
        }
    };

    const handleProductDelete = (id: string) => {
        if (!token || token === 'legacy-token') {
            showError('Please log in as admin to delete products');
            return;
        }
        setProductToDelete(id);
    };

    const confirmDeleteProduct = async () => {
        if (!productToDelete || !token || token === 'legacy-token') return;
        const id = productToDelete;
        setProductToDelete(null);

        const dismissLoading = showLoading('Removing product and Cloudinary assets...');
        try {
            await productService.delete(id, token);
            dismissLoading();
            showSuccess('Product deleted', 'Product record and all Cloudinary assets removed');
            fetchProducts();
            onProductsChange?.();
        } catch (err: any) {
            dismissLoading();
            showError(err.message || 'Failed to delete');
        }
    };

    const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'baseImage' | 'backImage' | 'thumbnailImage') => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const fieldLabel = field === 'baseImage' ? 'Base' : field === 'backImage' ? 'Back' : 'Thumbnail';
        const existingUrl = productForm.images?.[field];
        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        let dismissLoading: (() => void) | null = null;
        if (existingUrl?.includes('cloudinary.com')) {
            dismissLoading = showLoading('Removing old image...');
            try {
                await adminService.deleteImageFromCloudinary(existingUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete old image from Cloudinary:', err);
            } finally {
                dismissLoading?.();
            }
        }

        dismissLoading = showLoading(`Uploading ${fieldLabel} image...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
            const { folder, customId } = getProductImageFolderAndId(productSlug, field, file.name, categoryType, productForm._id);
            const path = await uploadFile(file, folder, customId);
            if (path) {
                setProductForm((prev: any) => ({ ...prev, images: { ...prev.images, [field]: path } }));
                showSuccess(`${fieldLabel} image updated`);
            }
        } catch (err) {
            console.error(err);
            showError('Upload failed');
        } finally {
            dismissLoading?.();
        }
    };

    const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
        const newImages: string[] = [];

        const dismissLoading = showLoading(`Uploading ${files.length} gallery image(s)...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Append a unique timestamp/index to distinguish multiple gallery uploads
                const timestampId = `gallery-${Date.now()}-${i}`;
                const { folder, customId } = getProductImageFolderAndId(productSlug, timestampId, file.name, categoryType, productForm._id);
                const path = await uploadFile(file, folder, customId);
                if (path) newImages.push(path);
            }

            if (newImages.length > 0) {
                setProductForm((prev: any) => ({
                    ...prev,
                    images: {
                        ...prev.images,
                        gallery: [...(prev.images?.gallery || []), ...newImages]
                    }
                }));
                showSuccess(`${newImages.length} gallery image(s) uploaded`);
            }
        } catch (err) {
            console.error('[Admin] Gallery upload failed:', err);
            showError('Failed to upload some gallery images');
        } finally {
            // Free up the input so the same files can be selected again if needed
            e.target.value = '';
            dismissLoading();
        }
    };

    const handleToggleCardHover = (imageUrl: string) => {
        setProductForm((prev: any) => {
            const current = [...(prev.images?.cardHoverGallery || [])];
            const isSelected = current.includes(imageUrl);
            const updated = isSelected
                ? current.filter((url: string) => url !== imageUrl)
                : [...current, imageUrl];

            return {
                ...prev,
                images: {
                    ...prev.images,
                    cardHoverGallery: updated
                }
            };
        });
    };

    const handleRemoveGalleryImage = async (index: number) => {
        const imageUrl = productForm.images?.gallery?.[index];
        if (!imageUrl) return;

        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        // Optimistically remove from state
        setProductForm((prev: any) => {
            const newGallery = [...(prev.images?.gallery || [])];
            newGallery.splice(index, 1);

            const updatedCardHover = (prev.images?.cardHoverGallery || []).filter((url: string) => url !== imageUrl);

            return {
                ...prev,
                images: {
                    ...prev.images,
                    gallery: newGallery,
                    cardHoverGallery: updatedCardHover
                }
            };
        });

        // Delete from Cloudinary in background
        if (imageUrl.includes('cloudinary.com')) {
            try {
                await adminService.deleteImageFromCloudinary(imageUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete gallery image:', err);
            }
        }
    };

    const handleMoveGalleryImage = (index: number, direction: 'left' | 'right') => {
        setProductForm((prev: any) => {
            const newGallery = [...(prev.images?.gallery || [])];
            if (direction === 'left' && index > 0) {
                [newGallery[index - 1], newGallery[index]] = [newGallery[index], newGallery[index - 1]];
            } else if (direction === 'right' && index < newGallery.length - 1) {
                [newGallery[index + 1], newGallery[index]] = [newGallery[index], newGallery[index + 1]];
            } else {
                return prev;
            }
            return {
                ...prev,
                images: { ...prev.images, gallery: newGallery }
            };
        });
    };

    const handleReorderGalleryImage = (oldIndex: number, newIndexValue: string) => {
        const newIndex = parseInt(newIndexValue) - 1;
        setProductForm((prev: any) => {
            const gallery = [...(prev.images?.gallery || [])];
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= gallery.length || newIndex === oldIndex) {
                return prev;
            }
            const [movedItem] = gallery.splice(oldIndex, 1);
            gallery.splice(newIndex, 0, movedItem);
            return {
                ...prev,
                images: { ...prev.images, gallery }
            };
        });
    };

    const handleFabricGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !selectedFabricIdForGallery) return;

        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
        const newImages: string[] = [];

        const fabric = productForm.customizationOptions?.fabrics?.find((f: any) => f.id === selectedFabricIdForGallery)
            || fabrics3D.find(f => f._id === selectedFabricIdForGallery);
        const fabricName = fabric?.name || 'fabric';

        const dismissLoading = showLoading(`Uploading ${files.length} images for ${fabricName}...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const timestampId = `gallery-${selectedFabricIdForGallery}-${Date.now()}-${i}`;
                const folder = getProductFolderPrefix(productSlug, categoryType, productForm._id) + `gallery/${idSlug(selectedFabricIdForGallery, fabricName)}/`;
                const customId = idSlug(timestampId, file.name);

                const path = await uploadFile(file, folder, customId);
                if (path) newImages.push(path);
            }

            if (newImages.length > 0) {
                setProductForm((prev: any) => {
                    const galleryByFabric = { ...(prev.images?.galleryByFabric || {}) };
                    galleryByFabric[selectedFabricIdForGallery] = [
                        ...(galleryByFabric[selectedFabricIdForGallery] || []),
                        ...newImages
                    ];
                    return {
                        ...prev,
                        images: { ...prev.images, galleryByFabric }
                    };
                });
                showSuccess(`${newImages.length} images uploaded for ${fabricName}`);
            }
        } catch (err) {
            console.error('[Admin] Fabric gallery upload failed:', err);
            showError('Failed to upload some images');
        } finally {
            e.target.value = '';
            dismissLoading();
        }
    };

    const handleRemoveFabricGalleryImage = async (fabricId: string, index: number) => {
        const images = productForm.images?.galleryByFabric?.[fabricId];
        const imageUrl = images?.[index];
        if (!imageUrl) return;

        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        setProductForm((prev: any) => {
            const galleryByFabric = { ...(prev.images?.galleryByFabric || {}) };
            const newFabricGallery = [...(galleryByFabric[fabricId] || [])];
            newFabricGallery.splice(index, 1);
            if (newFabricGallery.length === 0) {
                delete galleryByFabric[fabricId];
            } else {
                galleryByFabric[fabricId] = newFabricGallery;
            }
            return {
                ...prev,
                images: { ...prev.images, galleryByFabric }
            };
        });

        if (imageUrl.includes('cloudinary.com')) {
            try {
                await adminService.deleteImageFromCloudinary(imageUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete fabric gallery image:', err);
            }
        }
    };

    const handleMoveFabricGalleryImage = (fabricId: string, index: number, direction: 'left' | 'right') => {
        setProductForm((prev: any) => {
            const galleryByFabric = { ...(prev.images?.galleryByFabric || {}) };
            const newGallery = [...(galleryByFabric[fabricId] || [])];
            if (direction === 'left' && index > 0) {
                [newGallery[index - 1], newGallery[index]] = [newGallery[index], newGallery[index - 1]];
            } else if (direction === 'right' && index < newGallery.length - 1) {
                [newGallery[index + 1], newGallery[index]] = [newGallery[index], newGallery[index + 1]];
            } else {
                return prev;
            }
            galleryByFabric[fabricId] = newGallery;
            return {
                ...prev,
                images: { ...prev.images, galleryByFabric }
            };
        });
    };

    const handleReorderFabricGalleryImage = (fabricId: string, oldIndex: number, newIndexValue: string) => {
        const newIndex = parseInt(newIndexValue) - 1;
        setProductForm((prev: any) => {
            const galleryByFabric = { ...(prev.images?.galleryByFabric || {}) };
            const gallery = [...(galleryByFabric[fabricId] || [])];
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= gallery.length || newIndex === oldIndex) {
                return prev;
            }
            const [movedItem] = gallery.splice(oldIndex, 1);
            gallery.splice(newIndex, 0, movedItem);
            galleryByFabric[fabricId] = gallery;
            return {
                ...prev,
                images: { ...prev.images, galleryByFabric }
            };
        });
    };

    // Product Fabric Helpers (2D)
    const addProductFabric = () => {
        setProductForm((prev: any) => ({
            ...prev,
            customizationOptions: {
                ...prev.customizationOptions,
                fabrics: [{ id: `f${Date.now()}`, name: 'New Fabric', imageUrl: '', previewImage: '', priceModifier: 0, order: 0 }, ...(prev.customizationOptions?.fabrics || [])],
            },
        }));
    };

    const updateProductFabric = (index: number, field: string, value: any) => {
        setProductForm((prev: any) => {
            const updated = [...(prev.customizationOptions?.fabrics || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, customizationOptions: { ...prev.customizationOptions, fabrics: updated } };
        });
    };

    const removeProductFabric = async (index: number) => {
        const fabric = productForm.customizationOptions?.fabrics?.[index];
        const urls: string[] = [];
        if (fabric?.imageUrl?.includes('cloudinary.com')) urls.push(fabric.imageUrl);
        if (fabric?.previewImage?.includes('cloudinary.com')) urls.push(fabric.previewImage);
        if (fabric?.backPreviewImage?.includes('cloudinary.com')) urls.push(fabric.backPreviewImage);
        if (urls.length > 0 && token && token !== 'legacy-token') {
            const dismissLoading = showLoading('Removing fabric images from Cloudinary...');
            try {
                await adminService.deleteImagesFromCloudinary(urls, token);

                // ALSO delete the prefix folder so we don't leave empty folders!
                const productSlug = productForm.name || productForm.slug || 'new-product';
                const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
                const prefix = getProductFolderPrefix(productSlug, categoryType, productForm._id?.toString()) + `fabrics/${idSlug(fabric?.id || '', fabric?.name)}/`;
                await adminService.deleteByPrefix(prefix, token).catch(e => console.error("Prefix delete fallback failed", e));
            } catch (err) {
                console.error('[Admin] Failed to delete fabric images from Cloudinary:', err);
            } finally {
                dismissLoading();
            }
        }
        setProductForm((prev: any) => {
            const updated = [...(prev.customizationOptions?.fabrics || [])];
            const deletedFabric = updated[index];
            if (!deletedFabric) return prev;
            updated.splice(index, 1);

            // Cascade deletion into optionGroups so variants are fully decoupled from React State
            const updatedGroups = (prev.customizationOptions?.optionGroups || []).map((group: any) => {
                const newOptions = (group.options || []).map((opt: any) => {
                    const newOpt = { ...opt };
                    if (newOpt.layersByFabric && deletedFabric.id) {
                        const newLayers = { ...newOpt.layersByFabric };
                        delete newLayers[deletedFabric.id];
                        newOpt.layersByFabric = newLayers;
                    }
                    if (newOpt.fabricPreviewImages && deletedFabric.id) {
                        const newPreviews = { ...newOpt.fabricPreviewImages };
                        delete newPreviews[deletedFabric.id];
                        newOpt.fabricPreviewImages = newPreviews;
                    }
                    if (newOpt.backHalfFabricPreviewImages && deletedFabric.id) {
                        const newBackHalf = { ...newOpt.backHalfFabricPreviewImages };
                        delete newBackHalf[deletedFabric.id];
                        newOpt.backHalfFabricPreviewImages = newBackHalf;
                    }
                    if (newOpt.backFullFabricPreviewImages && deletedFabric.id) {
                        const newBackFull = { ...newOpt.backFullFabricPreviewImages };
                        delete newBackFull[deletedFabric.id];
                        newOpt.backFullFabricPreviewImages = newBackFull;
                    }
                    return newOpt;
                });
                return { ...group, options: newOptions };
            });

            return {
                ...prev,
                customizationOptions: {
                    ...prev.customizationOptions,
                    fabrics: updated,
                    optionGroups: updatedGroups
                }
            };
        });
    };

    const handleProductFabricImageUpload = async (index: number, field: 'imageUrl' | 'previewImage' | 'backPreviewImage', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const fabric = productForm.customizationOptions?.fabrics?.[index];
        const existingUrl = fabric?.[field];
        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        let dismissLoading: (() => void) | null = null;
        if (existingUrl?.includes('cloudinary.com')) {
            dismissLoading = showLoading('Removing old fabric image...');
            try {
                await adminService.deleteImageFromCloudinary(existingUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete old fabric image from Cloudinary:', err);
            } finally {
                dismissLoading?.();
            }
        }

        const fieldLabel = field === 'imageUrl' ? 'base' : field === 'previewImage' ? 'preview' : 'back preview';
        dismissLoading = showLoading(`Uploading fabric ${fieldLabel} image...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            let slot = 'base';
            if (field === 'previewImage') slot = 'preview';
            if (field === 'backPreviewImage') slot = 'back-preview';
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
            // {id}-{slug} pattern: immutable ID + browsable name
            const fabricId = fabric?.id || `fabric-${Date.now()}`;
            const fabricName = fabric?.name;
            const { folder, customId } = getProductFabricFolderAndId(productSlug, fabricId, fabricName, slot, file.name, categoryType, productForm._id);
            const path = await uploadFile(file, folder, customId);
            if (path) {
                updateProductFabric(index, field, path);
                showSuccess(`Fabric ${fieldLabel} image updated`);
            }
        } catch (err) {
            console.error(err);
            showError('Upload failed');
        } finally {
            dismissLoading?.();
        }
    };

    // Option Group Helpers
    const addOptionGroup = () => {
        setProductForm((prev: any) => ({
            ...prev,
            customizationOptions: {
                ...prev.customizationOptions,
                optionGroups: [{ id: `g${Date.now()}`, label: 'New Group', category: 'fit', order: 0, options: [] }, ...(prev.customizationOptions?.optionGroups || [])],
            },
        }));
    };

    const updateOptionGroup = (index: number, field: string, value: any) => {
        setProductForm((prev: any) => {
            const updated = [...(prev.customizationOptions?.optionGroups || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: updated } };
        });
    };

    const slugifyPath = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item';

    const removeOptionGroup = (index: number) => {
        const group = productForm.customizationOptions?.optionGroups?.[index];
        const productSlug = productForm.name || productForm.slug || 'new-product';
        const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
        const groupId = group?.id || 'group';
        const groupLabel = group?.label || group?.name;
        const prefix = getProductFolderPrefix(productSlug, categoryType, productForm._id?.toString()) + `options/${idSlug(groupId, groupLabel)}/`;

        // Optimistic state update
        setProductForm((prev: any) => {
            const updated = [...(prev.customizationOptions?.optionGroups || [])];
            updated.splice(index, 1);
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: updated } };
        });

        if (token && token !== 'legacy-token') {
            // Fire and forget background deletion without blocking UI
            adminService.deleteByPrefix(prefix, token).catch(err => {
                console.error('[Admin] Failed to delete option group folder from Cloudinary in background:', err);
            });
            showSuccess('Option group removed');
        }
    };

    const addGroupOption = (groupIndex: number) => {
        setProductForm((prev: any) => {
            const groups = [...(prev.customizationOptions?.optionGroups || [])];
            const group = groups[groupIndex];
            groups[groupIndex] = { ...group, options: [{ id: `o${Date.now()}`, name: 'New Option', category: group.category, image: '', previewImage: '', priceModifier: 0, order: 0, isDefault: false }, ...(group.options || [])] };
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
        });
    };

    const updateGroupOption = (groupIndex: number, optionIndex: number, field: string, value: any) => {
        setProductForm((prev: any) => {
            const groups = [...(prev.customizationOptions?.optionGroups || [])];
            const group = groups[groupIndex];
            const options = [...(group.options || [])];
            options[optionIndex] = { ...options[optionIndex], [field]: value };
            groups[groupIndex] = { ...group, options };
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
        });
    };

    const removeGroupOption = (groupIndex: number, optionIndex: number) => {
        const group = productForm.customizationOptions?.optionGroups?.[groupIndex];
        const option = group?.options?.[optionIndex];
        const productSlug = productForm.name || productForm.slug || 'new-product';
        const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
        const groupId = group?.id || 'group';
        const groupLabel = group?.label || group?.name;
        const optionId = option?.id || 'option';
        const optionLabel = option?.name;
        const prefix = getProductFolderPrefix(productSlug, categoryType, productForm._id?.toString()) + `options/${idSlug(groupId, groupLabel)}/${idSlug(optionId, optionLabel)}/`;

        // Optimistic state update
        setProductForm((prev: any) => {
            const groups = [...(prev.customizationOptions?.optionGroups || [])];
            const g = groups[groupIndex];
            const options = [...(g.options || [])];
            options.splice(optionIndex, 1);
            groups[groupIndex] = { ...g, options };
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
        });

        if (token && token !== 'legacy-token') {
            // Fire and forget background deletion without blocking UI
            adminService.deleteByPrefix(prefix, token).catch(err => {
                console.error('[Admin] Failed to delete option folder from Cloudinary in background:', err);
            });
            showSuccess('Option removed');
        }
    };

    const moveOptionGroup = (index: number, direction: 'up' | 'down') => {
        setProductForm((prev: any) => {
            const groups = [...(prev.customizationOptions?.optionGroups || [])];
            if (direction === 'up' && index > 0) {
                [groups[index - 1], groups[index]] = [groups[index], groups[index - 1]];
            } else if (direction === 'down' && index < groups.length - 1) {
                [groups[index + 1], groups[index]] = [groups[index], groups[index + 1]];
            } else {
                return prev;
            }
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
        });
    };

    const moveGroupOption = (groupIndex: number, optionIndex: number, direction: 'up' | 'down') => {
        setProductForm((prev: any) => {
            const groups = [...(prev.customizationOptions?.optionGroups || [])];
            const group = { ...groups[groupIndex] };
            const options = [...(group.options || [])];

            if (direction === 'up' && optionIndex > 0) {
                [options[optionIndex - 1], options[optionIndex]] = [options[optionIndex], options[optionIndex - 1]];
            } else if (direction === 'down' && optionIndex < options.length - 1) {
                [options[optionIndex + 1], options[optionIndex]] = [options[optionIndex], options[optionIndex + 1]];
            } else {
                return prev;
            }

            group.options = options;
            groups[groupIndex] = group;
            return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
        });
    };

    const handleGroupOptionImageUpload = async (groupIndex: number, optionIndex: number, field: 'image' | 'previewImage', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const group = productForm.customizationOptions?.optionGroups?.[groupIndex];
        const option = group?.options?.[optionIndex];
        const existingUrl = option?.[field];
        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        let dismissLoading: (() => void) | null = null;
        if (existingUrl?.includes('cloudinary.com')) {
            dismissLoading = showLoading('Removing old option image...');
            try {
                await adminService.deleteImageFromCloudinary(existingUrl, authToken);
            } catch (err) {
                console.error('[Admin] Failed to delete old option image from Cloudinary:', err);
            } finally {
                dismissLoading?.();
            }
        }

        const fieldLabel = field === 'image' ? 'thumbnail' : 'preview';
        dismissLoading = showLoading(`Uploading option ${fieldLabel}...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const groupId = group?.id || 'option-group';
            const groupLabel = group?.label || group?.name;
            const optionId = option?.id || 'option';
            const optionLabel = option?.name;
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
            const { folder, customId } = getProductOptionFolderAndId(productSlug, groupId, groupLabel, optionId, optionLabel, fieldLabel, file.name, categoryType, productForm._id);
            const path = await uploadFile(file, folder, customId);
            if (path) {
                updateGroupOption(groupIndex, optionIndex, field, path);
                showSuccess(`Option ${fieldLabel} updated`);
            }
        } catch (err) {
            console.error(err);
            showError('Upload failed');
        } finally {
            dismissLoading?.();
        }
    };

    // 3D Fabric CRUD Helpers
    const reset3DFabricForm = () => {
        setFabric3DForm({
            name: '', category: 'cotton', colorMapUrl: '', normalMapUrl: '', roughnessMapUrl: '',
            baseColor: '#FFFFFF', roughness: 0.8, metalness: 0.0, normalScale: 1.0, price: 0, thumbnailUrl: '',
            _tempId: `temp-${Date.now()}`
        });
        setEditing3DFabric(null);
    };

    const open3DFabricDialog = (fabric?: Fabric3D) => {
        if (fabric) {
            setEditing3DFabric(fabric);
            setFabric3DForm({
                name: fabric.name, category: fabric.category, colorMapUrl: fabric.colorMapUrl,
                normalMapUrl: fabric.normalMapUrl || '', roughnessMapUrl: fabric.roughnessMapUrl || '',
                baseColor: fabric.baseColor, roughness: fabric.roughness, metalness: fabric.metalness,
                normalScale: fabric.normalScale, price: fabric.price, thumbnailUrl: fabric.thumbnailUrl || '',
                _tempId: ''
            });
            fabric3DFormInitialUrlsRef.current = new Set(collect3DFabricFormCloudinaryUrls(fabric));
        } else {
            reset3DFabricForm();
            fabric3DFormInitialUrlsRef.current = new Set();
        }
        setIs3DFabricDialogOpen(true);
    };

    const handle3DFabricDialogClose = (open: boolean) => {
        if (!open) {
            const currentUrls = collect3DFabricFormCloudinaryUrls(fabric3DForm);
            const initialUrls = fabric3DFormInitialUrlsRef.current;
            const toDelete = currentUrls.filter((u) => !initialUrls.has(u));
            if (toDelete.length && token && token !== 'legacy-token') {
                deleteCloudinaryUrlsFromAdmin(toDelete, token);
            }
            reset3DFabricForm();
        }
        setIs3DFabricDialogOpen(open);
    };

    const handle3DFabricTextureUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'colorMapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'thumbnailUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const fieldLabel = field === 'colorMapUrl' ? 'Color map' : field === 'normalMapUrl' ? 'Normal map' : field === 'roughnessMapUrl' ? 'Roughness map' : 'Thumbnail';
        const existingUrl = (fabric3DForm as any)[field];
        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

        let dismissLoading: (() => void) | null = null;
        if (existingUrl?.includes('cloudinary.com')) {
            dismissLoading = showLoading('Removing old texture...');
            try { await adminService.deleteImageFromCloudinary(existingUrl, authToken); }
            catch (err) { console.error(err); }
            finally { dismissLoading?.(); }
        }

        dismissLoading = showLoading(`Uploading ${fieldLabel}...`);
        try {
            // Immutable ID heavily preferred. Renaming 'White' to 'Champagne' will no longer break existing folders.
            const fabricIdentifier = editing3DFabric?._id || (fabric3DForm as any)._tempId || `temp-${Date.now()}`;
            const fabricLabel = editing3DFabric?.name || fabric3DForm?.name;
            const productSlug = (isProductDialogOpen && productForm.categoryType === '3d') ? (productForm.name || productForm.slug || 'new-product') : null;
            const { folder, customId } = productSlug
                ? getProduct3DTextureMapFolderAndId(productSlug, fabricIdentifier, fabricLabel, field, file.name, productForm._id)
                : getProduct3DTextureMapFolderAndId('unassigned-product', fabricIdentifier, fabricLabel, field, file.name);

            // Use dedicated texture upload route (POST /api/upload/texture)
            // which enforces WebP conversion via cloudinary.uploader.upload()
            // instead of the generic /api/upload that uses upload_stream (ignores format param)
            const textureFormData = new FormData();
            textureFormData.append('folder', folder);
            if (customId) textureFormData.append('custom_public_id', customId.replace(/[^a-zA-Z0-9-_/]/g, '-'));

            // Limit 3D texture resolution to 1024px (Web Performance Standard)
            // This prevents 4K/8K raw images from creating massive 2MB+ WebP files!
            textureFormData.append('max_dimension', '1024');

            textureFormData.append('image', file);
            const textureResult = await adminService.uploadTexture(textureFormData, authToken);
            const path = textureResult?.path || null;

            // ALWAYS auto-upload a thumbnail copy when color map is uploaded
            let thumbPath: string | null = null;
            if (path && field === 'colorMapUrl') {
                try {
                    // Clean up existing thumbnail from Cloudinary before replacing
                    const oldThumb = fabric3DForm.thumbnailUrl;
                    if (oldThumb && oldThumb.includes('cloudinary.com') && token && token !== 'legacy-token') {
                        await adminService.deleteImageFromCloudinary(oldThumb, token).catch(() => { });
                    }

                    const thumbParams = productSlug
                        ? getProduct3DTextureMapFolderAndId(productSlug, fabricIdentifier, fabricLabel, 'thumbnailUrl', file.name, productForm._id)
                        : getProduct3DTextureMapFolderAndId('unassigned-product', fabricIdentifier, fabricLabel, 'thumbnailUrl', file.name);

                    const thumbFormData = new FormData();
                    thumbFormData.append('folder', thumbParams.folder);
                    if (thumbParams.customId) thumbFormData.append('custom_public_id', thumbParams.customId.replace(/[^a-zA-Z0-9-_/]/g, '-'));
                    thumbFormData.append('max_dimension', '512'); // Thumbnails stored at 512px instead of full 2048px
                    thumbFormData.append('image', file);
                    const thumbResult = await adminService.uploadTexture(thumbFormData, authToken);
                    thumbPath = thumbResult?.path || null;
                } catch (e: any) {
                    console.error('[3DFabric] Thumbnail auto-upload FAILED:', e);
                    showError(`Thumbnail auto-upload failed: ${e.message}`);
                }
            }

            if (path) {
                setFabric3DForm(prev => {
                    const updates: any = { [field]: path };
                    if (thumbPath) updates.thumbnailUrl = thumbPath;
                    return { ...prev, ...updates };
                });
                showSuccess(`${fieldLabel} uploaded${thumbPath ? ' (+ thumbnail)' : ''}`);
            }
        } catch (err) {
            console.error(err);
            showError('Upload failed');
        } finally {
            dismissLoading?.();
        }
    };

    const save3DFabric = async () => {
        if (!fabric3DForm.name || !fabric3DForm.colorMapUrl) { showError('Name and Color Map are required'); return; }
        try {
            const method = editing3DFabric ? 'PUT' : 'POST';
            const url = editing3DFabric ? `/api/fabrics/${editing3DFabric._id}` : '/api/fabrics';
            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ ...fabric3DForm, price: Number(fabric3DForm.price) }),
            });
            const savedData = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(savedData.error || 'Failed to save fabric');
            const savedFabric = savedData?.data;
            showSuccess(editing3DFabric ? '3D Fabric updated' : '3D Fabric added');
            setIs3DFabricDialogOpen(false);
            reset3DFabricForm();
            fetch3DFabrics();
            if (!editing3DFabric && savedFabric?._id && isProductDialogOpen && productForm.categoryType === '3d') {
                setProductForm((p: any) => ({ ...p, fabricIds: [...(p.fabricIds || []), savedFabric._id] }));
            }
        } catch (err: any) { showError(err.message); }
    };

    // 3D Fabric Deletion State
    const [isDeleteFabricDialogOpen, setIsDeleteFabricDialogOpen] = useState(false);
    const [fabricToDelete, setFabricToDelete] = useState<string | null>(null);
    const [fabricDeleteWarning, setFabricDeleteWarning] = useState<string | null>(null);

    const delete3DFabric = async (id: string) => {
        if (!token || token === 'legacy-token') { showError('Super admin login required'); return; }
        try {
            const { count } = await adminService.getFabricUsage(id, token);
            const msg = count > 0 ? `This fabric is currently used by ${count} product(s). Deleting it will remove it from these products.` : null;

            setFabricToDelete(id);
            setFabricDeleteWarning(msg);
            setIsDeleteFabricDialogOpen(true);
        } catch (err: any) { showError(err.message); }
    };

    const confirmDeleteFabric = async () => {
        if (!fabricToDelete || !token) return;

        const dismissLoading = showLoading('Deleting fabric...');
        try {
            await fetch(`/api/fabrics/${fabricToDelete}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            dismissLoading();
            showSuccess('3D Fabric deleted');
            // Remove from active product form if present
            setProductForm((p: any) => ({ ...p, fabricIds: (p.fabricIds || []).filter((fid: string) => fid !== fabricToDelete) }));
            fetch3DFabrics();
        } catch (err: any) {
            dismissLoading();
            showError(err.message);
        } finally {
            setIsDeleteFabricDialogOpen(false);
            setFabricToDelete(null);
            setFabricDeleteWarning(null);
        }
    };

    const add3DFabricToProduct = (fabricId: string) => {
        if ((productForm.fabricIds || []).includes(fabricId)) return;
        setProductForm((p: any) => ({ ...p, fabricIds: [...(p.fabricIds || []), fabricId] }));
    };

    // For variant upload in options
    const handleGroupOptionVariantUpload = async (groupIndex: number, optionIndex: number, fabricId: string, view: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const group = productForm.customizationOptions?.optionGroups?.[groupIndex];
        const option = group?.options?.[optionIndex];
        // Existing variants logic... simplified for brevity, assuming standard path
        const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';
        const dismissLoading = showLoading(`Uploading ${view} variant...`);
        try {
            const productSlug = productForm.name || productForm.slug || 'new-product';
            const categoryType = (productForm.categoryType || '2d') as '2d' | '3d';
            const groupId = group?.id || 'group';
            const groupLabel = group?.label || group?.name;
            const optionId = option?.id || 'option';
            const optionLabel = option?.name;
            const fabric = productForm.customizationOptions?.fabrics?.find((f: any) => f.id === fabricId);
            const { folder, customId } = getProductOptionVariantFolderAndId(productSlug, groupId, groupLabel, optionId, optionLabel, fabricId, fabric?.name, view, file.name, categoryType, productForm._id);
            const path = await uploadFile(file, folder, customId);
            if (path) {
                // Update state
                setProductForm((prev: any) => {
                    const groups = [...(prev.customizationOptions?.optionGroups || [])];
                    const g = groups[groupIndex];
                    const options = [...(g.options || [])];
                    const opt = options[optionIndex];
                    const variants = opt.layersByFabric?.[fabricId] || opt.fabricPreviewImages?.[fabricId] || {};
                    const newVariants = typeof variants === 'string'
                        ? { front: variants, [view]: path }
                        : { ...variants, [view]: path };

                    // Update layersByFabric
                    options[optionIndex] = {
                        ...opt,
                        layersByFabric: { ...(opt.layersByFabric || {}), [fabricId]: newVariants }
                    };
                    groups[groupIndex] = { ...g, options };
                    return { ...prev, customizationOptions: { ...prev.customizationOptions, optionGroups: groups } };
                });
                showSuccess('Variant image uploaded');
            }
        } catch (err) {
            console.error(err);
            showError('Upload failed');
        } finally {
            dismissLoading?.();
        }
    };

    if (productsLoading && !products.length) return <div className="text-center py-32"><div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" /></div>;

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold">Products</h2>
                <Button onClick={() => handleOpenProductDialog()} className="bg-gradient-luxury text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-5 h-5 mr-2" /> New Product
                </Button>
            </div>

            {productsError ? (
                <div className="text-center py-32"><p className="text-destructive">{productsError}</p></div>
            ) : products.length === 0 ? (
                <div className="text-center py-32">
                    <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-display text-xl font-medium">No products yet</h3>
                    <p className="text-muted-foreground">Create your first product to get started</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((product, i) => (
                        <div key={product._id} className="group bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-500 animate-fade-up motion-reduce:animate-none" style={{ animationDelay: `${i * 0.06}s` }}>
                            <div className="relative aspect-square bg-muted/30">
                                {product.images?.baseImage ? (
                                    <img src={getMediumThumbnailUrl(product.images.baseImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(product.images.baseImage)); }} alt={product.name} className="w-full h-full object-contain p-4 cursor-pointer hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground/30" /></div>
                                )}
                                {product.categoryType === '3d' && (
                                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-gradient-luxury text-white text-xs font-semibold flex items-center gap-1 shadow-md">
                                        <Box className="w-3 h-3" /> 3D
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button size="sm" onClick={() => handleOpenProductDialog(product)} className="rounded-lg"><Edit className="w-4 h-4 mr-1" />Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleProductDelete(product._id)} className="rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">{product.category}</span>
                                    <span className="font-semibold text-sm">{formatPrice(product.basePrice)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Product Dialog */}
            <Dialog open={isProductDialogOpen} onOpenChange={handleProductDialogClose}>
                <DialogContent
                    onInteractOutside={(e) => e.preventDefault()}
                    hideCloseButton
                    className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none"
                >
                    <div className="px-6 py-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                        <div>
                            <DialogTitle className="font-display text-xl font-bold text-slate-900">{productForm._id ? 'Edit Product' : 'New Product'}</DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">Configure product details, customization options, and variants.</DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleProductDialogClose(false)} className="rounded-full hover:bg-slate-100">
                            <X className="w-5 h-5 opacity-60" />
                        </Button>
                    </div>

                    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/30">
                        <Tabs key={productForm.categoryType || '2d'} defaultValue="general" className="flex flex-col flex-1 min-h-0">
                            <div className="px-6 pb-4 shrink-0 bg-white border-b border-border/50 z-index-1">
                                <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    {productForm.categoryType === '3d' ? (
                                        <>
                                            <TabsTrigger value="fabrics-3d">3D Fabrics</TabsTrigger>
                                            <TabsTrigger value="assets">Assets</TabsTrigger>
                                        </>
                                    ) : (
                                        <>
                                            <TabsTrigger value="fabrics">Fabrics</TabsTrigger>
                                            <TabsTrigger value="options">Options</TabsTrigger>
                                        </>
                                    )}
                                </TabsList>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                                <TabsContent value="general" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Product Name</Label>
                                        <Input value={productForm.name} onChange={(e) => setProductForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Product Name" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input value={productForm.description} onChange={(e) => setProductForm((p: any) => ({ ...p, description: e.target.value }))} placeholder="Description" className="rounded-xl" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Category Type</Label>
                                            <Select value={productForm.categoryType || '2d'} onValueChange={(v) => setProductForm((p: any) => ({ ...p, categoryType: v }))}>
                                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2d">2D</SelectItem>
                                                    <SelectItem value="3d">3D</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sub-category</Label>
                                            <Select value={productForm.category} onValueChange={(v) => setProductForm((p: any) => ({ ...p, category: v }))}>
                                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {productCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Base Price (PKR)</Label>
                                            <Input type="number" value={productForm.basePrice} onChange={(e) => setProductForm((p: any) => ({ ...p, basePrice: e.target.value }))} className="rounded-xl" />
                                        </div>
                                        <div className="flex items-end pb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!productForm.showInHeroSlider}
                                                    onChange={(e) => setProductForm((p: any) => ({ ...p, showInHeroSlider: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium">Show in Homepage Hero</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Base Image (Default)</Label>
                                        <input ref={productBaseRef} type="file" accept="image/*" onChange={(e) => handleProductImageUpload(e, 'baseImage')} className="hidden" />
                                        <Button variant="outline" className="w-full rounded-xl" onClick={() => productBaseRef.current?.click()}>
                                            <Upload className="w-4 h-4 mr-2" />Upload Base Image
                                        </Button>
                                        {productForm.images?.baseImage && <img src={getMediumThumbnailUrl(productForm.images.baseImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(productForm.images.baseImage)); }} alt="" className="h-40 w-full object-contain rounded-lg mt-2 bg-muted/20 p-2 cursor-pointer hover:scale-[1.02] transition-transform" />}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-semibold">Gallery Images</Label>
                                                <p className="text-xs text-muted-foreground mt-0.5">Add multiple angles (Front, Back, Side, Detail). The first image will be used for the hover effect.</p>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    id="gallery-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleGalleryImagesUpload}
                                                    className="hidden"
                                                />
                                                <Button variant="outline" size="sm" onClick={() => document.getElementById('gallery-upload')?.click()} className="rounded-lg h-9">
                                                    <Upload className="w-4 h-4 mr-2" /> Add Images
                                                </Button>
                                            </div>
                                        </div>

                                        {(productForm.images?.gallery?.length || 0) > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {productForm.images.gallery.map((url: string, index: number) => {
                                                    const isHover = index === 0;
                                                    const isOnCard = (productForm.images?.cardHoverGallery || []).includes(url);
                                                    let semanticLabel = 'Image';
                                                    if (index === 0) semanticLabel = 'Front (Hover)';
                                                    else if (index === 1) semanticLabel = 'Back';
                                                    else if (index === 2) semanticLabel = 'Side';
                                                    else if (index === 3) semanticLabel = 'Detail';

                                                    return (
                                                        <div key={`${url}-${index}`} className={`group relative rounded-xl border p-2 flex flex-col gap-2 transition-all ${isOnCard ? 'bg-primary/5 border-primary shadow-sm' : 'bg-muted/20 border-border/50'
                                                            }`}>
                                                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white">
                                                                <img
                                                                    src={getMediumThumbnailUrl(url)}
                                                                    alt={`Gallery ${index + 1}`}
                                                                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(url)); }}
                                                                />
                                                                <div className="absolute top-1 left-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity drop-shadow-md">
                                                                    <Button
                                                                        type="button"
                                                                        variant={isOnCard ? "default" : "secondary"}
                                                                        size="icon"
                                                                        className={`w-7 h-7 rounded-md shadow-sm ${isOnCard ? 'bg-primary text-white' : 'bg-white/90 hover:bg-white text-slate-600'
                                                                            }`}
                                                                        onClick={() => handleToggleCardHover(url)}
                                                                        title={isOnCard ? "Remove from Card Slider" : "Show on Card Slider"}
                                                                    >
                                                                        <Monitor className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                                <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity drop-shadow-md">
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="w-7 h-7 rounded-md bg-destructive/90 hover:bg-destructive shadow-sm"
                                                                        onClick={() => handleRemoveGalleryImage(index)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                                <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        type="button"
                                                                        variant="secondary"
                                                                        size="icon"
                                                                        disabled={index === 0}
                                                                        className="w-7 h-7 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-sm"
                                                                        onClick={() => handleMoveGalleryImage(index, 'left')}
                                                                    >
                                                                        {/* ChevronLeft icon representation */}
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6" /></svg>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="secondary"
                                                                        size="icon"
                                                                        disabled={index === productForm.images.gallery.length - 1}
                                                                        className="w-7 h-7 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-sm"
                                                                        onClick={() => handleMoveGalleryImage(index, 'right')}
                                                                    >
                                                                        {/* ChevronRight icon representation */}
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m9 18 6-6-6-6" /></svg>
                                                                    </Button>
                                                                </div>
                                                                {isOnCard && (
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <div className="bg-primary/20 text-primary px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter backdrop-blur-sm border border-primary/30">On Card</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center px-1">
                                                                <div className="flex items-center gap-0.5 group/idx">
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">#</span>
                                                                    <input
                                                                        key={`${index}-${productForm.images?.gallery?.length}`}
                                                                        type="number"
                                                                        min="1"
                                                                        max={productForm.images?.gallery?.length || 1}
                                                                        defaultValue={index + 1}
                                                                        onBlur={(e) => handleReorderGalleryImage(index, e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleReorderGalleryImage(index, (e.target as HTMLInputElement).value);
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                        className="w-8 h-5 bg-white border border-border rounded text-center text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                                                        title="Change number and press Enter or click away to reorder"
                                                                    />
                                                                </div>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${isHover ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                                                                    {semanticLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-slate-50/50">
                                                <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground">No gallery images added yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Phase 60: Fabric-Specific Galleries Section */}
                                    <div className="mt-8 pt-6 border-t border-border/50">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Palette className="w-5 h-5 text-primary" />
                                                    Fabric-Specific Galleries
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Upload 2-5 model shots for each specific fabric</p>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <Select value={selectedFabricIdForGallery} onValueChange={setSelectedFabricIdForGallery}>
                                                    <SelectTrigger className="w-full md:w-[200px] rounded-xl h-10 border-border/60">
                                                        <SelectValue placeholder="Select Fabric" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {productForm.categoryType === '3d' ? (
                                                            fabrics3D
                                                                .filter(f => productForm.fabricIds?.includes(f._id))
                                                                .map(f => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)
                                                        ) : (
                                                            (productForm.customizationOptions?.fabrics || []).map((f: any) => (
                                                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 px-4 rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all flex items-center gap-2 shrink-0"
                                                    onClick={() => {
                                                        if (window.confirm('Clear ALL fabric-specific gallery images? This cannot be undone.')) {
                                                            setProductForm(prev => ({
                                                                ...prev,
                                                                images: {
                                                                    ...prev.images,
                                                                    galleryByFabric: {}
                                                                }
                                                            }));
                                                            showSuccess('All fabric galleries cleared');
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Clear All</span>
                                                </Button>

                                                <input
                                                    id="fabric-gallery-upload"
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleFabricGalleryUpload}
                                                    className="hidden"
                                                />
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    disabled={!selectedFabricIdForGallery}
                                                    onClick={() => document.getElementById('fabric-gallery-upload')?.click()}
                                                    className="rounded-xl h-10 px-4 shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Gallery Images
                                                </Button>
                                            </div>
                                        </div>

                                        {selectedFabricIdForGallery ? (
                                            <div className="space-y-4">
                                                {productForm.images?.galleryByFabric?.[selectedFabricIdForGallery]?.length > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {productForm.images.galleryByFabric[selectedFabricIdForGallery].map((url: string, idx: number) => (
                                                            <div key={`${url}-${idx}`} className="group relative bg-muted/20 rounded-xl border border-border/50 p-2 flex flex-col gap-2">
                                                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white">
                                                                    <img
                                                                        src={getMediumThumbnailUrl(url)}
                                                                        alt={`Fabric Gallery ${idx + 1}`}
                                                                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                        onClick={() => { setPreviewImageUrl(getImageUrl(url)); }}
                                                                    />
                                                                    <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="icon"
                                                                            className="w-7 h-7 rounded-md bg-destructive/90 hover:bg-destructive shadow-sm"
                                                                            onClick={() => handleRemoveFabricGalleryImage(selectedFabricIdForGallery, idx)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center px-1">
                                                                    <div className="flex items-center gap-0.5 group/idx">
                                                                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">#</span>
                                                                        <input
                                                                            key={`${idx}-${selectedFabricIdForGallery}-${productForm.images.galleryByFabric[selectedFabricIdForGallery].length}`}
                                                                            type="number"
                                                                            min="1"
                                                                            max={productForm.images.galleryByFabric[selectedFabricIdForGallery].length}
                                                                            defaultValue={idx + 1}
                                                                            onBlur={(e) => handleReorderFabricGalleryImage(selectedFabricIdForGallery, idx, e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    handleReorderFabricGalleryImage(selectedFabricIdForGallery, idx, (e.target as HTMLInputElement).value);
                                                                                    (e.target as HTMLInputElement).blur();
                                                                                }
                                                                            }}
                                                                            className="w-8 h-5 bg-white border border-primary rounded text-center text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                                                            title="Change number and press Enter or click away to reorder"
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium bg-slate-100 text-slate-600">
                                                                        Image
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-border/50 rounded-xl p-12 text-center bg-slate-50/30">
                                                        <Upload className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                                                        <p className="text-sm text-muted-foreground">Select a fabric above and upload model shots to start its categorized gallery.</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50/50 rounded-xl p-12 text-center border border-border/30">
                                                <p className="text-sm text-muted-foreground">Please select a fabric from the dropdown to manage its gallery.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Fabrics Tab (2D) */}
                                {productForm.categoryType !== '3d' && (
                                    <TabsContent value="fabrics" className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <Label className="text-base font-semibold">Product Fabrics</Label>
                                            <Button variant="outline" size="sm" onClick={addProductFabric} className="rounded-lg h-10 px-3 py-2 shrink-0"><Plus className="w-3 h-3 mr-1" />Add Fabric</Button>
                                        </div>
                                        <div className="space-y-3">
                                            {(productForm.customizationOptions?.fabrics || []).map((fabric: any, i: number) => (
                                                <div key={fabric.id} className="p-4 bg-white rounded-xl border border-border/50 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                        <div className="md:col-span-5">
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                                                            <Input value={fabric.name || ''} onChange={(e) => updateProductFabric(i, 'name', e.target.value)} placeholder="Name" className="h-9 rounded-lg" />
                                                        </div>
                                                        <div className="md:col-span-4">
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Price (+PKR)</Label>
                                                            <Input type="number" value={fabric.priceModifier || 0} onChange={(e) => updateProductFabric(i, 'priceModifier', Number(e.target.value))} className="h-9 rounded-lg" />
                                                        </div>
                                                        <div className="md:col-span-3 flex items-end justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => removeProductFabric(i)} className="rounded-lg text-destructive hover:bg-destructive/10 h-9 w-9"><Trash2 className="w-4 h-4" /></Button>
                                                        </div>
                                                    </div>
                                                    {/* Image uploads row */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {/* Pattern Tile */}
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Pattern Tile</Label>
                                                            <input id={`pf-img-${i}`} type="file" accept="image/*" onChange={(e) => handleProductFabricImageUpload(i, 'imageUrl', e)} className="hidden" />
                                                            <div className="relative group/thumb h-20 w-full border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50" onClick={() => document.getElementById(`pf-img-${i}`)?.click()}>
                                                                {fabric.imageUrl ? (
                                                                    <>
                                                                        <img src={getMediumThumbnailUrl(fabric.imageUrl)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric.imageUrl)); }} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                                        <button type="button" onClick={async (ev) => { ev.stopPropagation(); const url = fabric.imageUrl; if (url?.includes('cloudinary.com') && token && token !== 'legacy-token') { try { await adminService.deleteImageFromCloudinary(url, token); } catch { } } updateProductFabric(i, 'imageUrl', ''); }} className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><Upload className="w-3.5 h-3.5" />Tile</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Front Preview */}
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Front Preview</Label>
                                                            <input id={`pf-front-${i}`} type="file" accept="image/*" onChange={(e) => handleProductFabricImageUpload(i, 'previewImage', e)} className="hidden" />
                                                            <div className="relative group/thumb h-20 w-full border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50" onClick={() => document.getElementById(`pf-front-${i}`)?.click()}>
                                                                {fabric.previewImage ? (
                                                                    <>
                                                                        <img src={getMediumThumbnailUrl(fabric.previewImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric.previewImage)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                                        <button type="button" onClick={async (ev) => { ev.stopPropagation(); const url = fabric.previewImage; if (url?.includes('cloudinary.com') && token && token !== 'legacy-token') { try { await adminService.deleteImageFromCloudinary(url, token); } catch { } } updateProductFabric(i, 'previewImage', ''); }} className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><Upload className="w-3.5 h-3.5" />Front</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Back Preview */}
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Back Preview</Label>
                                                            <input id={`pf-back-${i}`} type="file" accept="image/*" onChange={(e) => handleProductFabricImageUpload(i, 'backPreviewImage', e)} className="hidden" />
                                                            <div className="relative group/thumb h-20 w-full border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50" onClick={() => document.getElementById(`pf-back-${i}`)?.click()}>
                                                                {fabric.backPreviewImage ? (
                                                                    <>
                                                                        <img src={getMediumThumbnailUrl(fabric.backPreviewImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric.backPreviewImage)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                                        <button type="button" onClick={async (ev) => { ev.stopPropagation(); const url = fabric.backPreviewImage; if (url?.includes('cloudinary.com') && token && token !== 'legacy-token') { try { await adminService.deleteImageFromCloudinary(url, token); } catch { } } updateProductFabric(i, 'backPreviewImage', ''); }} className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><Upload className="w-3.5 h-3.5" />Back</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}

                                {/* 3D Fabrics Tab */}
                                {productForm.categoryType === '3d' && (
                                    <TabsContent value="fabrics-3d" className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <Label className="text-base font-semibold">3D Fabrics</Label>
                                            <div className="flex gap-2 items-center">
                                                <Button variant="outline" size="sm" onClick={() => open3DFabricDialog()} className="rounded-lg h-10 px-3 py-2 shrink-0"><Plus className="w-3 h-3 mr-1" />Create New</Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {productForm.fabricIds?.map((fabricId: string, index: number) => {
                                                const f = fabrics3D.find(f => f._id === fabricId);
                                                if (!f) return null;

                                                const previewUrl = productForm.images?.fabricPreviewThumbnails?.[index];

                                                return (
                                                    <div key={`${f._id}-${index}`} className="group relative bg-white rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                                        <div className="aspect-square bg-muted/30 relative shrink-0">
                                                            <img src={getFabricThumbnailUrl(f) || f.thumbnailUrl || f.colorMapUrl} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(f.colorMapUrl)); }} alt={f.name} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                            <div onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(f.colorMapUrl)); }} className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-2 cursor-pointer">
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); open3DFabricDialog(f); }} className="rounded-lg h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                                                                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); delete3DFabric(f._id); }} className="rounded-lg h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Preview Thumbnail Section (1:1 Index Matching) */}
                                                        <div className="p-3 flex-1 flex flex-col border-t border-border/30 bg-slate-50">
                                                            <h4 className="font-medium text-sm truncate mb-2 text-center">{f.name}</h4>
                                                            <div className="mt-auto">
                                                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block text-center">Stylized Preview</Label>
                                                                <div className="relative group/preview-thumb h-20 w-full border rounded-lg overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById(`3d-preview-${index}`)?.click()}>
                                                                    <input
                                                                        id={`3d-preview-${index}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            e.target.value = '';

                                                                            const existingUrl = productForm.images?.fabricPreviewThumbnails?.[index];
                                                                            const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

                                                                            let dismissLoading = null;
                                                                            if (existingUrl?.includes('cloudinary.com')) {
                                                                                dismissLoading = showLoading('Removing old preview...');
                                                                                try { await adminService.deleteImageFromCloudinary(existingUrl, authToken); }
                                                                                catch (err) { console.error(err); }
                                                                                finally { dismissLoading?.(); }
                                                                            }

                                                                            dismissLoading = showLoading('Uploading new preview...');
                                                                            try {
                                                                                const productSlug = productForm.name || productForm.slug || 'new-product';
                                                                                const categoryType = '3d';
                                                                                const { folder, customId } = getProductFabricPreviewFolderAndId(productSlug, index, Date.now(), file.name, categoryType, productForm._id);

                                                                                const path = await uploadFile(file, folder, customId);
                                                                                if (path) {
                                                                                    setProductForm((prev: any) => {
                                                                                        const updated = [...(prev.images?.fabricPreviewThumbnails || [])];
                                                                                        updated[index] = path;
                                                                                        return { ...prev, images: { ...prev.images, fabricPreviewThumbnails: updated } };
                                                                                    });
                                                                                    showSuccess('Preview updated');
                                                                                }
                                                                            } catch (err) {
                                                                                showError('Upload failed');
                                                                            } finally {
                                                                                dismissLoading?.();
                                                                            }
                                                                        }}
                                                                        className="hidden"
                                                                    />
                                                                    {previewUrl ? (
                                                                        <>
                                                                            <img src={getMediumThumbnailUrl(previewUrl)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(previewUrl)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform p-1" />
                                                                            <button type="button" onClick={async (ev) => {
                                                                                ev.stopPropagation();
                                                                                if (previewUrl?.includes('cloudinary.com') && token && token !== 'legacy-token') {
                                                                                    try { await adminService.deleteImageFromCloudinary(previewUrl, token); } catch { }
                                                                                }
                                                                                setProductForm((prev: any) => {
                                                                                    const updated = [...(prev.images?.fabricPreviewThumbnails || [])];
                                                                                    updated[index] = ''; // Keep the index slot so array doesn't shift
                                                                                    return { ...prev, images: { ...prev.images, fabricPreviewThumbnails: updated } };
                                                                                });
                                                                            }} className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/preview-thumb:opacity-100 transition-opacity cursor-pointer shadow-sm">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><Upload className="w-3.5 h-3.5" />Upload</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TabsContent>
                                )}

                                {/* Options Tab (2D) - Simplified for brevity */}
                                {productForm.categoryType !== '3d' && (
                                    <TabsContent value="options" className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <Label className="text-base font-semibold">Customization Groups</Label>
                                            <Button variant="outline" size="sm" onClick={addOptionGroup} className="rounded-lg"><Plus className="w-3 h-3 mr-1" />Add Group</Button>
                                        </div>
                                        <div className="space-y-6">
                                            {(productForm.customizationOptions?.optionGroups || []).map((group: any, gi: number) => (
                                                <div key={group.id} className="p-4 bg-muted/20 rounded-xl border border-border/50 space-y-4">
                                                    <div className="flex gap-3 items-end">
                                                        <div className="flex-1">
                                                            <Label className="text-xs text-muted-foreground">Group Label</Label>
                                                            <Input
                                                                value={group.label}
                                                                onChange={(e) => {
                                                                    updateOptionGroup(gi, 'label', e.target.value);
                                                                    // Auto-generate internal key if it's empty or heavily matches the previous label, to keep it sync'd cleanly behind the scenes.
                                                                    if (!group.category || group.category === group.label?.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                                                                        updateOptionGroup(gi, 'category', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                                                    }
                                                                }}
                                                                placeholder="e.g. Collar Style"
                                                                className="rounded-lg bg-white"
                                                            />
                                                        </div>
                                                        <div className="hidden">
                                                            <Input value={group.category} onChange={(e) => updateOptionGroup(gi, 'category', e.target.value)} />
                                                        </div>
                                                        <div className="w-36">
                                                            <Label className="text-xs text-muted-foreground">Upload Type</Label>
                                                            <Select value={group.variantType || 'fabric'} onValueChange={(v) => updateOptionGroup(gi, 'variantType', v)}>
                                                                <SelectTrigger className="rounded-lg bg-white h-10"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="fabric">Per Fabric</SelectItem>
                                                                    <SelectItem value="front-back">Front + Back</SelectItem>
                                                                    <SelectItem value="front-only">Front Only</SelectItem>
                                                                    <SelectItem value="back-only">Back Only</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex gap-1 items-end pb-[2px]">
                                                            <Button variant="ghost" size="icon" onClick={() => moveOptionGroup(gi, 'up')} disabled={gi === 0} className="rounded-lg h-10 w-8 text-muted-foreground hover:bg-white hover:text-primary"><ArrowUp className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => moveOptionGroup(gi, 'down')} disabled={gi === (productForm.customizationOptions?.optionGroups?.length || 0) - 1} className="rounded-lg h-10 w-8 text-muted-foreground hover:bg-white hover:text-primary"><ArrowDown className="w-4 h-4" /></Button>
                                                            <Button variant="destructive" size="icon" onClick={() => removeOptionGroup(gi)} className="rounded-lg h-10 w-10 ml-2"><Trash2 className="w-4 h-4" /></Button>
                                                        </div>
                                                    </div>
                                                    <div className="pl-4 border-l-2 border-border/50 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-sm font-medium">Options in this Group</Label>
                                                            <Button variant="ghost" size="sm" onClick={() => addGroupOption(gi)} className="rounded-lg hover:bg-white"><Plus className="w-3 h-3 mr-1" />Add Option</Button>
                                                        </div>
                                                        {(group.options || []).map((opt: any, oi: number) => (
                                                            <div key={opt.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 bg-white rounded-lg items-center border border-border/20 shadow-sm">
                                                                <div className="md:col-span-3">
                                                                    <Input value={opt.name || ''} onChange={(e) => updateGroupOption(gi, oi, 'name', e.target.value)} placeholder="Name" className="h-8 text-sm rounded-md" />
                                                                </div>
                                                                <div className="md:col-span-2 relative">
                                                                    <input id={`go-img-${gi}-${oi}`} type="file" accept="image/*" onChange={(e) => handleGroupOptionImageUpload(gi, oi, 'image', e)} className="hidden" />
                                                                    <div className="group/step h-16 w-16 mx-auto border shrink-0 rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 overflow-hidden relative" onClick={() => document.getElementById(`go-img-${gi}-${oi}`)?.click()}>
                                                                        {opt.image ? (
                                                                            <>
                                                                                <img src={getMediumThumbnailUrl(opt.image)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(opt.image)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                                                <button type="button" onClick={async (ev) => { ev.stopPropagation(); const url = opt.image; if (url?.includes('cloudinary.com') && token && token !== 'legacy-token') { try { await adminService.deleteImageFromCloudinary(url, token); } catch { } } updateGroupOption(gi, oi, 'image', ''); }} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/step:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                            </>
                                                                        ) : <span className="text-[10px] text-muted-foreground flex gap-1"><Upload className="w-3 h-3" /> Step</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="md:col-span-2 relative">
                                                                    <input id={`go-prev-${gi}-${oi}`} type="file" accept="image/*" onChange={(e) => handleGroupOptionImageUpload(gi, oi, 'previewImage', e)} className="hidden" />
                                                                    <div className="group/style h-16 w-16 mx-auto border shrink-0 rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 overflow-hidden relative" onClick={() => document.getElementById(`go-prev-${gi}-${oi}`)?.click()}>
                                                                        {opt.previewImage ? (
                                                                            <>
                                                                                <img src={getMediumThumbnailUrl(opt.previewImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(opt.previewImage)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                                                <button type="button" onClick={async (ev) => { ev.stopPropagation(); const url = opt.previewImage; if (url?.includes('cloudinary.com') && token && token !== 'legacy-token') { try { await adminService.deleteImageFromCloudinary(url, token); } catch { } } updateGroupOption(gi, oi, 'previewImage', ''); }} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover/style:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                            </>
                                                                        ) : <span className="text-[10px] text-muted-foreground flex gap-1"><Layers className="w-3 h-3" /> Style</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="md:col-span-2">
                                                                    <Input type="number" value={opt.priceModifier || 0} onChange={(e) => updateGroupOption(gi, oi, 'priceModifier', Number(e.target.value))} placeholder="+PKR" className="h-8 text-sm rounded-md" />
                                                                </div>
                                                                <div className="md:col-span-2 flex justify-center">
                                                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                                                        <input type="checkbox" checked={!!opt.isDefault} onChange={(e) => updateGroupOption(gi, oi, 'isDefault', e.target.checked)} className="rounded border-gray-300 w-3 h-3" /> Default
                                                                    </label>
                                                                </div>
                                                                <div className="md:col-span-1 flex justify-end gap-0.5">
                                                                    <Button variant="ghost" size="icon" onClick={() => moveGroupOption(gi, oi, 'up')} disabled={oi === 0} className="h-8 w-7 text-muted-foreground hover:text-primary"><ArrowUp className="w-3.5 h-3.5" /></Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => moveGroupOption(gi, oi, 'down')} disabled={oi === (group.options?.length || 0) - 1} className="h-8 w-7 text-muted-foreground hover:text-primary"><ArrowDown className="w-3.5 h-3.5" /></Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => removeGroupOption(gi, oi)} className="h-8 w-8 ml-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                </div>
                                                                {/* Upload section — adapts based on group variantType */}
                                                                <div className="md:col-span-12 pt-2 border-t border-dashed mt-2 flex justify-end">
                                                                    {(() => {
                                                                        const vt = group.variantType || 'fabric';
                                                                        const label = vt === 'fabric' ? 'Fabric Variants' : vt === 'front-back' ? 'Front + Back' : vt === 'front-only' ? 'Front' : 'Back';
                                                                        const count = vt === 'fabric'
                                                                            ? (opt.layersByFabric ? Object.keys(opt.layersByFabric).length : 0)
                                                                            : (opt.layersByView ? Object.keys(opt.layersByView).filter(k => opt.layersByView[k]).length : 0);
                                                                        return (
                                                                            <Button
                                                                                variant="outline" size="sm"
                                                                                onClick={() => vt === 'fabric' ? setActiveVariantOption({ gi, oi }) : setActiveViewOption({ gi, oi })}
                                                                                className="text-xs h-7 items-center gap-1.5 text-slate-600"
                                                                            >
                                                                                <Palette className="w-3 h-3" />
                                                                                {label} {count > 0 && <span className="bg-primary/10 text-primary px-1.5 rounded-full text-[10px] font-bold">{count}</span>}
                                                                            </Button>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}

                                {/* Assets Tab (3D) */}
                                {productForm.categoryType === '3d' && (
                                    <TabsContent value="assets" className="space-y-4">
                                        <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-sm text-muted-foreground">
                                            <p>3D model and HDRI assigned to this product. Remove = unlink only. Delete = remove from Cloudinary.</p>
                                        </div>

                                        {/* 3D Model Card */}
                                        <div className="bg-white border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <Box className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">3D Model (.glb)</h4>
                                                    <p className="text-xs text-muted-foreground">GLB/GLTF model for 3D viewer</p>
                                                    {productForm.modelUrl && <p className="text-[10px] text-muted-foreground mt-1 max-w-[300px] truncate">{productForm.modelUrl}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept=".glb,.gltf"
                                                        className="hidden"
                                                        id="model-upload"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;

                                                            // We cannot use the generic `uploadFile` here because we need to hit 
                                                            // the new `/api/upload/model` endpoint for background gltfpack compression
                                                            const dismiss = showLoading('Uploading Model (may take a minute)...');
                                                            try {
                                                                const folderSlug = productForm.name || productForm.slug || 'new-product';
                                                                const customFolder = getProductAssetsFolder(folderSlug, '3d-model', productForm._id);

                                                                const formData = new FormData();
                                                                formData.append('folder', customFolder);
                                                                formData.append('custom_public_id', file.name.replace(/[^a-zA-Z0-9-_.]/g, '-'));
                                                                formData.append('model', file); // Field name must match glbUpload.single('model')

                                                                const authToken = token && token !== 'legacy-token' ? token : 'legacy-token';

                                                                const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
                                                                const uploadUrl = baseUrl ? `${baseUrl}/api/upload/model` : '/api/upload/model';

                                                                const res = await fetch(uploadUrl, {
                                                                    method: 'POST',
                                                                    headers: { Authorization: `Bearer ${authToken}` },
                                                                    body: formData,
                                                                });

                                                                const data = await res.json().catch(() => ({}));

                                                                if (res.ok && data?.path) {
                                                                    setProductForm((prev: any) => ({ ...prev, modelUrl: data.path }));
                                                                    showSuccess(`Model uploaded successfully!`);
                                                                } else {
                                                                    throw new Error(data?.error || 'Upload failed');
                                                                }
                                                            } catch (err: any) {
                                                                console.error('[Admin Model Upload]', err);
                                                                showError(err.message || 'Upload failed');
                                                            }
                                                            finally { dismiss(); }
                                                        }}
                                                    />
                                                    <Button onClick={() => document.getElementById('model-upload')?.click()} className="bg-slate-900 text-white hover:bg-slate-800">
                                                        <Upload className="w-4 h-4 mr-2" /> Upload
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* HDRI Card */}
                                        <div className="bg-white border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">HDRI (.hdr/.exr)</h4>
                                                    <p className="text-xs text-muted-foreground">Environment map for lighting</p>
                                                    {productForm.environmentMapUrl && <p className="text-[10px] text-muted-foreground mt-1 max-w-[300px] truncate">{productForm.environmentMapUrl}</p>}
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".hdr,.exr"
                                                    className="hidden"
                                                    id="hdri-upload"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        // Fallback check
                                                        if (file.size > 50 * 1024 * 1024) {
                                                            showError('File too large. Maximum supported size is 50MB.');
                                                            return;
                                                        }

                                                        const dismiss = showLoading('Uploading HDRI (may take a minute)...');
                                                        try {
                                                            const formData = new FormData();
                                                            formData.append('file', file);
                                                            const folderSlug = productForm.name || productForm.slug || 'new-product';
                                                            const customFolder = getProductAssetsFolder(folderSlug, 'environment-map', productForm._id);
                                                            formData.append('folder', customFolder);

                                                            const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
                                                            formData.append('publicId', `${safeName}-${Date.now().toString().slice(-6)}`);

                                                            const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
                                                            const uploadUrl = baseUrl ? `${baseUrl}/api/upload/hdri` : '/api/upload/hdri';

                                                            const res = await fetch(uploadUrl, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Authorization': `Bearer ${token}`,
                                                                },
                                                                body: formData,
                                                            });

                                                            if (!res.ok) {
                                                                const err = await res.json();
                                                                throw new Error(err.error ?? 'HDR upload failed');
                                                            }

                                                            const data = await res.json();
                                                            setProductForm((prev: any) => ({ ...prev, environmentMapUrl: data.url }));

                                                            dismiss();
                                                            showSuccess(`HDRI uploaded successfully`);
                                                        } catch (err: any) {
                                                            console.error('Failed to upload HDRI:', err);
                                                            dismiss();
                                                            showError(`HDRI upload failed: ${err.message}`);
                                                        }
                                                    }}
                                                />
                                                <Button onClick={() => document.getElementById('hdri-upload')?.click()} className="bg-slate-900 text-white hover:bg-slate-800">
                                                    <Upload className="w-4 h-4 mr-2" /> Upload
                                                </Button>
                                            </div>
                                        </div>

                                        {/* General Files Card */}
                                        <div className="bg-white border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">General Files</h4>
                                                    <p className="text-xs text-muted-foreground">Other assets (images, docs)</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    id="general-upload"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const dismiss = showLoading('Uploading File...');
                                                        try {
                                                            const folderSlug = productForm.name || productForm.slug || 'new-product';
                                                            const customFolder = getProductAssetsFolder(folderSlug, 'general', productForm._id);
                                                            const path = await uploadFile(file, customFolder, file.name);
                                                            if (path) {
                                                                // Just show the URL for now as requested by user "safely refer functionality"
                                                                // Assuming user copies it or it's just a utility
                                                                prompt("File uploaded. Copy URL:", getImageUrl(path));
                                                                showSuccess('File uploaded');
                                                            }
                                                        } catch (err) { showError('Upload failed'); }
                                                        finally { dismiss(); }
                                                    }}
                                                />
                                                <Button variant="outline" onClick={() => document.getElementById('general-upload')?.click()}>
                                                    <Upload className="w-4 h-4 mr-2" /> Upload File
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                )}
                            </div>

                            <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-3 sm:gap-0 sticky bottom-0 z-10">
                                <Button variant="outline" onClick={() => handleProductDialogClose(false)} className="h-11 px-6 rounded-xl border-slate-300 text-slate-700 hover:bg-white hover:text-slate-900 font-medium">Cancel</Button>
                                <Button onClick={handleProductSave} className="h-11 px-8 rounded-xl bg-gradient-luxury text-white hover:shadow-lg transition-all font-medium">{productForm._id ? 'Save Changes' : 'Create Product'}</Button>
                            </DialogFooter>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={is3DFabricDialogOpen} onOpenChange={handle3DFabricDialogClose}>
                <DialogContent hideCloseButton onInteractOutside={(e) => e.preventDefault()} className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
                    <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                        <div>
                            <DialogTitle className="font-display text-2xl font-bold text-slate-900">{editing3DFabric ? 'Edit 3D Fabric' : 'Add New 3D Fabric'}</DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">Configure textures and physical properties.</DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handle3DFabricDialogClose(false)} className="rounded-full hover:bg-slate-100">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </Button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
                        {/* Name & Category Section */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-border/50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">Fabric Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={fabric3DForm.name}
                                        onChange={(e) => setFabric3DForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Midnight Blue Wool"
                                        className="h-11 rounded-xl bg-white border-slate-200 focus:border-primary focus:ring-primary/20 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">Category <span className="text-red-500">*</span></Label>
                                    <Select value={fabric3DForm.category} onValueChange={(v) => setFabric3DForm(prev => ({ ...prev, category: v as any }))}>
                                        <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cotton">Cotton</SelectItem>
                                            <SelectItem value="wool">Wool</SelectItem>
                                            <SelectItem value="linen">Linen</SelectItem>
                                            <SelectItem value="silk">Silk</SelectItem>
                                            <SelectItem value="blend">Blend</SelectItem>
                                            <SelectItem value="velvet">Velvet</SelectItem>
                                            <SelectItem value="seersucker">Seersucker</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* PBR Maps Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                                <Layers className="w-5 h-5 text-primary" />
                                <h3 className="font-display font-bold text-lg text-slate-900">Texture Maps</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                {/* Color Map */}
                                <div className="space-y-2 group">
                                    <div className="flex justify-between">
                                        <Label className="text-sm font-medium text-slate-600">Color Map <span className="text-red-500">*</span></Label>
                                        {fabric3DForm.colorMapUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>}
                                    </div>
                                    <input id="colorMap3D" type="file" accept="image/*" onChange={(e) => handle3DFabricTextureUpload(e, 'colorMapUrl')} className="hidden" />
                                    <div
                                        onClick={() => document.getElementById('colorMap3D')?.click()}
                                        className={`relative h-40 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300 ${fabric3DForm.colorMapUrl ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}
                                    >
                                        {fabric3DForm.colorMapUrl ? (
                                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                                                <img src={getMediumThumbnailUrl(fabric3DForm.colorMapUrl) || fabric3DForm.colorMapUrl} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric3DForm.colorMapUrl)); }} alt="Color Map" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">Change Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                    <Upload className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">Upload Color</span>
                                                <span className="text-[10px] text-slate-400">JPG/PNG</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Normal Map */}
                                <div className="space-y-2 group">
                                    <div className="flex justify-between">
                                        <Label className="text-sm font-medium text-slate-600">Normal Map</Label>
                                        {fabric3DForm.normalMapUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>}
                                    </div>
                                    <input id="normalMap3D" type="file" accept="image/*" onChange={(e) => handle3DFabricTextureUpload(e, 'normalMapUrl')} className="hidden" />
                                    <div
                                        onClick={() => document.getElementById('normalMap3D')?.click()}
                                        className={`relative h-40 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300 ${fabric3DForm.normalMapUrl ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}
                                    >
                                        {fabric3DForm.normalMapUrl ? (
                                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                                                <img src={getMediumThumbnailUrl(fabric3DForm.normalMapUrl) || fabric3DForm.normalMapUrl} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric3DForm.normalMapUrl)); }} alt="Normal Map" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">Change Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                    <Layers className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">Upload Normal</span>
                                                <span className="text-[10px] text-slate-400">Optional</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Roughness Map */}
                                <div className="space-y-2 group">
                                    <div className="flex justify-between">
                                        <Label className="text-sm font-medium text-slate-600">Roughness Map</Label>
                                        {fabric3DForm.roughnessMapUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>}
                                    </div>
                                    <input id="roughnessMap3D" type="file" accept="image/*" onChange={(e) => handle3DFabricTextureUpload(e, 'roughnessMapUrl')} className="hidden" />
                                    <div
                                        onClick={() => document.getElementById('roughnessMap3D')?.click()}
                                        className={`relative h-40 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300 ${fabric3DForm.roughnessMapUrl ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}
                                    >
                                        {fabric3DForm.roughnessMapUrl ? (
                                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                                                <img src={getMediumThumbnailUrl(fabric3DForm.roughnessMapUrl) || fabric3DForm.roughnessMapUrl} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric3DForm.roughnessMapUrl)); }} alt="Roughness Map" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">Change Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                    <Palette className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">Upload Roughness</span>
                                                <span className="text-[10px] text-slate-400">Optional</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Thumbnail Image */}
                                <div className="space-y-2 group">
                                    <div className="flex justify-between">
                                        <Label className="text-sm font-medium text-slate-600">Thumbnail Maps</Label>
                                        {fabric3DForm.thumbnailUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>}
                                    </div>
                                    <input id="thumbnail3D" type="file" accept="image/*" onChange={(e) => handle3DFabricTextureUpload(e, 'thumbnailUrl')} className="hidden" />
                                    <div
                                        onClick={() => document.getElementById('thumbnail3D')?.click()}
                                        className={`relative h-40 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300 ${fabric3DForm.thumbnailUrl ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}
                                    >
                                        {fabric3DForm.thumbnailUrl ? (
                                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                                                <img src={getMediumThumbnailUrl(fabric3DForm.thumbnailUrl) || fabric3DForm.thumbnailUrl} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric3DForm.thumbnailUrl)); }} alt="Thumbnail" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">Change Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                    <Layers className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">Upload Thumb</span>
                                                <span className="text-[10px] text-slate-400">JPG/PNG</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Material Properties Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h3 className="font-display font-bold text-lg text-slate-900">Physical Properties</h3>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-border/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Color</Label>
                                        <div className="flex items-center gap-2 h-11 bg-white rounded-xl border px-2">
                                            <Input
                                                type="color"
                                                value={fabric3DForm.baseColor}
                                                onChange={(e) => setFabric3DForm(prev => ({ ...prev, baseColor: e.target.value }))}
                                                className="w-10 h-8 p-0 rounded border-none cursor-pointer"
                                            />
                                            <div className="text-sm font-mono text-slate-600">{fabric3DForm.baseColor}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roughness</Label>
                                        <Input
                                            type="number" step="0.1" min="0" max="1"
                                            value={fabric3DForm.roughness}
                                            onChange={(e) => setFabric3DForm(prev => ({ ...prev, roughness: Number(e.target.value) }))}
                                            className="h-11 rounded-xl bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metalness</Label>
                                        <Input
                                            type="number" step="0.1" min="0" max="1"
                                            value={fabric3DForm.metalness}
                                            onChange={(e) => setFabric3DForm(prev => ({ ...prev, metalness: Number(e.target.value) }))}
                                            className="h-11 rounded-xl bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Normal Scale</Label>
                                        <Input
                                            type="number" step="0.1" max="2"
                                            value={fabric3DForm.normalScale}
                                            onChange={(e) => setFabric3DForm(prev => ({ ...prev, normalScale: Number(e.target.value) }))}
                                            className="h-11 rounded-xl bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2 pt-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price (PKR) <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₨</span>
                                            <Input
                                                type="number"
                                                value={fabric3DForm.price}
                                                onChange={(e) => setFabric3DForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                                className="h-11 pl-8 rounded-xl bg-white border-slate-200 font-medium text-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-5 border-t sticky bottom-0 z-10 bg-slate-50 gap-3 sm:gap-0">
                        <Button variant="outline" onClick={() => handle3DFabricDialogClose(false)} className="h-12 px-6 rounded-xl border-slate-300 text-slate-700 hover:bg-white hover:text-slate-900 font-medium">
                            Cancel
                        </Button>
                        <Button onClick={save3DFabric} className="h-12 px-8 rounded-xl bg-primary text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all font-medium">
                            {editing3DFabric ? 'Update Fabric' : 'Add Fabric'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {
                activeVariantOption && (
                    <VariantManagerDialog
                        open={!!activeVariantOption}
                        onClose={() => setActiveVariantOption(null)}
                        productFabrics={productForm.customizationOptions?.fabrics || []}
                        optionName={productForm.customizationOptions?.optionGroups?.[activeVariantOption.gi]?.options?.[activeVariantOption.oi]?.name}
                        variants={productForm.customizationOptions?.optionGroups?.[activeVariantOption.gi]?.options?.[activeVariantOption.oi]?.layersByFabric || {}}
                        onUpload={handleVariantImageUpload}
                        onRemove={removeVariantImage}
                        setPreviewImageUrl={setPreviewImageUrl}
                    />
                )
            }

            {
                activeViewOption && (() => {
                    const group = productForm.customizationOptions?.optionGroups?.[activeViewOption.gi];
                    const opt = group?.options?.[activeViewOption.oi];
                    const vt = group?.variantType || 'front-back';
                    const views: ('front' | 'back')[] = vt === 'front-only' ? ['front'] : vt === 'back-only' ? ['back'] : ['front', 'back'];
                    return (
                        <ViewManagerDialog
                            open={!!activeViewOption}
                            onClose={() => setActiveViewOption(null)}
                            optionName={opt?.name}
                            variantType={vt}
                            views={views}
                            layersByView={opt?.layersByView || {}}
                            onUpload={(view, e) => handleViewImageUpload(activeViewOption.gi, activeViewOption.oi, view, e)}
                            onRemove={(view) => removeViewImage(activeViewOption.gi, activeViewOption.oi, view)}
                            setPreviewImageUrl={setPreviewImageUrl}
                        />
                    );
                })()
            }

            <AlertDialog open={isDeleteFabricDialogOpen} onOpenChange={setIsDeleteFabricDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the fabric and remove it from our servers.
                            {fabricDeleteWarning && (
                                <div className="mt-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
                                    ⚠️ {fabricDeleteWarning}
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFabric} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Fabric
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Product Deletion Dialog */}
            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product and completely wipe all its Cloudinary assets (HDRI, Models, Option Images) from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Product
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Global Image Preview Modal */}
            <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
                <DialogContent hideCloseButton onInteractOutside={(e) => e.preventDefault()} className="max-w-2xl w-[95vw] sm:w-[90vw] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl z-[100]">
                    <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-white z-10">
                        <DialogTitle className="font-display text-xl font-bold text-foreground">Image Preview</DialogTitle>
                        <DialogDescription className="sr-only">View full resolution image.</DialogDescription>
                        <Button variant="ghost" size="icon" onClick={() => setPreviewImageUrl(null)} className="rounded-full hover:bg-slate-100 transition-colors">
                            <span className="sr-only">Close</span>
                            <X className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>
                    {previewImageUrl && (
                        <div className="flex-1 min-h-[70vh] relative">
                            <div className="absolute inset-0 p-6 sm:p-10 flex justify-center items-center bg-gradient-to-br from-muted/50 to-muted/30">
                                <OptimizedImage
                                    src={previewImageUrl}
                                    alt="High-Resolution Preview"
                                    className="w-full h-full drop-shadow-xl"
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function VariantManagerDialog({
    open,
    onClose,
    productFabrics,
    optionName,
    variants,
    onUpload,
    onRemove,
    setPreviewImageUrl
}: {
    open: boolean;
    onClose: () => void;
    productFabrics: any[];
    optionName: string;
    variants: Record<string, string | { front?: string; back?: string }>;
    onUpload: (file: File, fabricId: string, view: 'front' | 'back') => void;
    onRemove: (fabricId: string, view: 'front' | 'back') => void;
    setPreviewImageUrl: (url: string | null) => void;
}) {
    /** Resolve a variant entry to { front, back } regardless of legacy flat string format */
    const resolveVariant = (entry: string | { front?: string; back?: string } | undefined): { front?: string; back?: string } => {
        if (!entry) return {};
        if (typeof entry === 'string') return { front: entry };
        return entry;
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Variants: {optionName || 'Unnamed Option'}</DialogTitle>
                    <DialogDescription>Upload front and back images for each fabric color.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1 space-y-4 min-h-[300px]">
                    {productFabrics.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl">
                            No fabrics defined for this product yet. Add fabrics in the "Fabrics" tab first.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {productFabrics.map((fabric: any) => {
                                const resolved = resolveVariant(variants?.[fabric.id]);
                                return (
                                    <div key={fabric.id} className="border rounded-lg p-3 space-y-3 bg-white shadow-sm">
                                        {/* Fabric header */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border shadow-sm shrink-0 overflow-hidden">
                                                {fabric.previewImage ? (
                                                    <img src={getMediumThumbnailUrl(fabric.previewImage)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(fabric.previewImage)); }} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100" style={{ backgroundColor: fabric.color }} />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium truncate flex-1" title={fabric.name}>{fabric.name}</span>
                                        </div>

                                        {/* Front / Back upload slots */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['front', 'back'] as const).map((view) => {
                                                const url = resolved[view];
                                                return (
                                                    <div key={view} className="space-y-1">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{view}</span>
                                                        <div className="aspect-[3/4] rounded-md border-2 border-dashed relative group overflow-hidden bg-slate-50 flex items-center justify-center">
                                                            {url ? (
                                                                <>
                                                                    <img src={getMediumThumbnailUrl(url)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(url)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                        <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full" onClick={() => document.getElementById(`var-upload-${fabric.id}-${view}`)?.click()}>
                                                                            <Edit className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => onRemove(fabric.id, view)}>
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div
                                                                    className="flex flex-col items-center gap-1 text-slate-400 cursor-pointer hover:text-primary transition-colors"
                                                                    onClick={() => document.getElementById(`var-upload-${fabric.id}-${view}`)?.click()}
                                                                >
                                                                    <Upload className="w-4 h-4" />
                                                                    <span className="text-[10px]">Upload</span>
                                                                </div>
                                                            )}
                                                            <input
                                                                id={`var-upload-${fabric.id}-${view}`}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) onUpload(e.target.files[0], fabric.id, view);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ViewManagerDialog({
    open,
    onClose,
    optionName,
    variantType,
    views,
    layersByView,
    onUpload,
    onRemove,
    setPreviewImageUrl
}: {
    open: boolean;
    onClose: () => void;
    optionName: string;
    variantType: string;
    views: ('front' | 'back')[];
    layersByView: Record<string, string | undefined>;
    onUpload: (view: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (view: 'front' | 'back') => void;
    setPreviewImageUrl: (url: string | null) => void;
}) {
    const label = variantType === 'front-back' ? 'Front + Back' : variantType === 'front-only' ? 'Front' : 'Back';
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage {label}: {optionName || 'Unnamed Option'}</DialogTitle>
                    <DialogDescription>Upload {label.toLowerCase()} images for this option.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1 space-y-4 min-h-[200px]">
                    <div className={`grid ${views.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        {views.map((view) => {
                            const url = layersByView[view];
                            return (
                                <div key={view} className="border rounded-lg p-3 space-y-2 bg-white shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{view}</span>
                                    <div className="aspect-[3/4] rounded-md border-2 border-dashed relative group overflow-hidden bg-slate-50 flex items-center justify-center">
                                        {url ? (
                                            <>
                                                <img src={getMediumThumbnailUrl(url)} onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getImageUrl(url)); }} className="w-full h-full object-contain cursor-pointer hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                    <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full" onClick={() => document.getElementById(`view-upload-${view}`)?.click()}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>                                                    <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => onRemove(view)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center gap-1 text-slate-400 cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => document.getElementById(`view-upload-${view}`)?.click()}
                                            >
                                                <Upload className="w-4 h-4" />
                                                <span className="text-[10px]">Upload</span>
                                            </div>
                                        )}
                                        <input
                                            id={`view-upload-${view}`}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) onUpload(view, e);
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
