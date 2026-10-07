import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ShirtConfiguration, FabricOption, CustomizationOption, ShirtMeasurements } from '@/types/shirt';
import { Product } from '@/types/product';
import { productService } from '@/services/products';
import { apiClient } from '@/lib/apiClient';
import { getCustomizationState, saveCustomizationState } from '@/lib/customizationStorage';
import { settingsService } from '@/services/settingsService';

export interface CustomizationContextType {
  product: Product | null;
  config: ShirtConfiguration;
  // Dynamic collections for any product type
  options: Record<string, CustomizationOption[]>; // e.g. options['collar'] = [...]

  // Generic Getters/Setters
  fabrics: FabricOption[];
  styleGroups: Record<string, CustomizationOption[]>;
  productFabrics: FabricOption[];

  // Generic User Actions
  setOption: (category: string, option: CustomizationOption | null) => void;
  setFabric: (fabric: FabricOption | null) => void;
  setFabricColor: (color: string) => void;

  // CRUD Actions
  addFabric: (fabric: FabricOption) => void;
  addOption: (option: CustomizationOption) => void;
  removeFabric: (id: string) => void;
  removeOption: (id: string, category: string) => void;
  updateFabric: (id: string, updates: Partial<FabricOption>) => void;
  updateOption: (id: string, category: string, updates: Partial<CustomizationOption>) => void;

  // Generic CRUD aliases for compatibility if needed
  addCustomization: (option: CustomizationOption) => void;
  removeCustomization: (id: string, category: string) => void;
  updateCustomization: (id: string, category: string, updates: Partial<CustomizationOption>) => void;

  updateMeasurements: (measurements: Partial<ShirtMeasurements>) => void;
  activeStep: string;
  setActiveStep: (step: string) => void;
  viewMode: 'front' | 'back';
  setViewMode: (mode: 'front' | 'back') => void;
  totalPrice: number;
  loadProduct: (productId: string, defaultFabricId?: string) => Promise<void>;
  productNotFound: boolean;
  is2DEnabled: boolean;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [config, setConfig] = useState<ShirtConfiguration>({
    fabric: null,
    fabricColor: '#FFFFFF',
    styles: {},
    measurements: {
      neck: '', chest: '', waist: '', hips: '', shoulder: '', sleeveLength: '',
      shirtLength: '', inseam: '', outseam: '', rise: '', thigh: '', knee: '',
      legOpening: '', jacketLength: '', bicep: '', wrist: '', seat: '', lapelWidth: '',
    },
  });

  const [fabrics, setFabrics] = useState<FabricOption[]>([]);
  // Generic options state
  const [options, setOptions] = useState<Record<string, CustomizationOption[]>>({});

  const [activeStep, setActiveStep] = useState('fabric');
  const [viewMode, setViewMode] = useState<'front' | 'back'>('front');
  // [Navigation Guard] Tracks if a product is restricted (e.g. 2D disabled) or doesn't exist to trigger 404
  const [productNotFound, setProductNotFound] = useState(false);
  // [Global Toggle] Synchronized with Admin Settings to control 2D feature visibility across the app
  const [is2DEnabled, setIs2DEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    settingsService.getSettings().then(settings => {
      if (mounted && settings.is2DEnabled !== undefined) {
        setIs2DEnabled(settings.is2DEnabled);
      }
    });
    return () => { mounted = false; };
  }, []);

  const loadProduct = useCallback(async (productId: string, defaultFabricId?: string) => {
    try {
      setProductNotFound(false);
      // [API Fetch] Load product data by ID or Slug from the backend
      const productData = await productService.getById(productId);
      
      // [Security Guard] If 2D products are globally hidden, prevent access to 2D-type products
      if (productData.categoryType === '2d' && !is2DEnabled) {
          setProductNotFound(true);
          setProduct(null);
          return;
      }

      setProduct(productData);
      setViewMode('front');
      setActiveStep('fabric');

      // Map Fabrics
      const mappedFabrics = (productData.customizationOptions?.fabrics || []).map((fabric) => ({
        id: fabric.id,
        name: fabric.name,
        image: fabric.imageUrl || fabric.image || fabric.previewImage,
        previewImage: fabric.previewImage || fabric.imageUrl || fabric.image,
        backPreviewImage: fabric.backPreviewImage, // Pant Support
        priceModifier: fabric.priceModifier || 0,
        colors: fabric.colors || (fabric.color ? [fabric.color] : undefined),
        category: fabric.category,
      }));
      setFabrics(mappedFabrics);

      // Map Options - derive previewImage from layersByFabric when missing (e.g. fit options)
      const mapOption = (option: any, category: string) => {
        let previewImage = option.previewImage || option.imageUrl || option.image;
        if (!previewImage && option.layersByFabric && Object.keys(option.layersByFabric).length > 0) {
          const firstVariant = Object.values(option.layersByFabric)[0] as string | { front?: string; back?: string } | undefined;
          if (typeof firstVariant === 'string') previewImage = firstVariant;
          else if (firstVariant && typeof firstVariant === 'object') previewImage = firstVariant.front || firstVariant.back;
        }
        return {
          id: option.id,
          name: option.name,
          image: option.image || option.imageUrl || option.previewImage || previewImage,
          previewImage,
          priceModifier: option.priceModifier || 0,
          category: option.category || category,
          fabricPreviewImages: option.fabricPreviewImages || {},
          backHalfFabricPreviewImages: option.backHalfFabricPreviewImages || {},
          backFullFabricPreviewImages: option.backFullFabricPreviewImages || {},
          layersByFabric: option.layersByFabric || {},
          layersByView: option.layersByView || {},
          isDefault: option.isDefault || false,
          order: option.order || 0,
          tags: option.tags || [],
        };
      };

      const optionGroups = productData.customizationOptions?.optionGroups || [];
      const mappedOptions: Record<string, CustomizationOption[]> = {};

      if (optionGroups.length > 0) {
        optionGroups.forEach((group: any) => {
          const key = group.category || group.id;
          mappedOptions[key] = (group.options || []).map((option: any) => mapOption(option, key));
        });
      }

      setOptions(mappedOptions);

      // Set Defaults
      let defaultFabric = mappedFabrics.find((f: any) => f.isDefault) || mappedFabrics[0] || null;
      if (defaultFabricId) {
        const urlFabric = mappedFabrics.find(f => f.id === defaultFabricId);
        if (urlFabric) defaultFabric = urlFabric;
      }

      // Initialize config with defaults
      const initialStyles: Record<string, CustomizationOption | null> = {};
      Object.entries(mappedOptions).forEach(([key, opts]) => {
        initialStyles[key] = opts.find(o => o.isDefault) || opts[0] || null;
      });

      // Prepare initial state values for restoration
      let initialFabric = defaultFabric;
      let initialFabricColor = defaultFabric?.colors?.[0] || '#FFFFFF';
      const initialStylesState = { ...initialStyles };
      let initialActiveStep = 'fabric';
      let initialViewMode: 'front' | 'back' = 'front';

      // Try to load from localStorage
      try {
        const savedState = getCustomizationState(productData._id, 'customization_state');

        if (savedState) {

          // Restore Fabric
          if (savedState.fabricId) {
            const found = mappedFabrics.find(f => f.id === savedState.fabricId);
            if (found) {
              initialFabric = found;
              if (savedState.fabricColor && found.colors?.includes(savedState.fabricColor)) {
                initialFabricColor = savedState.fabricColor;
              } else {
                initialFabricColor = found.colors?.[0] || '#FFFFFF';
              }
            }
          }

          // Restore Styles
          if (savedState.styles) {
            Object.entries(savedState.styles).forEach(([cat, id]) => {
              const found = mappedOptions[cat]?.find(o => o.id === id);
              if (found) {
                initialStylesState[cat] = found;
              }
            });
          }

          if (savedState.activeStep) initialActiveStep = savedState.activeStep;
          if (savedState.viewMode) initialViewMode = savedState.viewMode;
        }
      } catch (e) {
        console.warn("Failed to restore customization state", e);
      }

      setConfig(prev => ({
        ...prev,
        fabric: initialFabric,
        fabricColor: initialFabricColor,
        styles: initialStylesState,
      }));

      setActiveStep(initialActiveStep);
      setViewMode(initialViewMode);

    } catch (error) {
      console.error('Failed to load product', error);
      setProductNotFound(true);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!product?._id) return;

    const stateToSave = {
      fabricId: config.fabric?.id,
      fabricColor: config.fabricColor,
      styles: Object.entries(config.styles).reduce((acc, [key, val]) => {
        if (val?.id) acc[key] = val.id;
        return acc;
      }, {} as Record<string, string>),
      activeStep,
      viewMode
    };

    saveCustomizationState(product._id, stateToSave, 'customization_state');
  }, [product, config, activeStep, viewMode]);

  const setOption = (category: string, option: CustomizationOption | null) => {
    setConfig(prev => {
      const updates: any = {
        styles: { ...prev.styles, [category]: option },
        [category]: option // Keep setting top-level for safe dynamic access
      };

      // Mutual exclusivity for necktie and bowtie
      if (category === 'necktie' && option) {
        updates.bowtie = null;
        updates.styles.bowtie = null;
      } else if (category === 'bowtie' && option) {
        updates.necktie = null;
        updates.styles.necktie = null;
      }

      return {
        ...prev,
        ...updates
      };
    });
  };

  const totalPrice = useMemo(() => {
    const basePrice = Number(product?.basePrice || 0);
    const fabricPrice = Number(config.fabric?.priceModifier || 0);
    const stylePrice = Object.values(config.styles || {}).reduce(
      (sum, option) => sum + Number(option?.priceModifier || 0),
      0
    );
    return basePrice + fabricPrice + stylePrice;
  }, [product, config.fabric, config.styles]);

  const addFabric = (fabric: FabricOption) => {
    const newFabrics = [...fabrics, fabric];
    setFabrics(newFabrics);
  };

  const addOption = (option: CustomizationOption) => {
    const category = option.category;
    const currentOptions = options[category] || [];
    const newOptions = [...currentOptions, option];
    setOptions(prev => ({ ...prev, [category]: newOptions }));
  };

  const removeFabric = (id: string) => {
    setFabrics(prev => prev.filter(f => f.id !== id));
  };

  const removeOption = (id: string, category: string) => {
    setOptions(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(o => o.id !== id)
    }));
  };

  const updateFabric = (id: string, updates: Partial<FabricOption>) => {
    setFabrics(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const updateOption = (id: string, category: string, updates: Partial<CustomizationOption>) => {
    setOptions(prev => ({
      ...prev,
      [category]: (prev[category] || []).map(o => o.id === id ? { ...o, ...updates } : o)
    }));
  };

  return (
    <CustomizationContext.Provider value={{
      product,
      config,
      options,
      fabrics,
      setOption,
      setFabric: (fabric) => {
        const defaultColor = fabric?.colors && fabric.colors.length > 0 ? fabric.colors[0] : '#FFFFFF';
        setConfig(prev => ({ ...prev, fabric, fabricColor: defaultColor }));
      },
      setFabricColor: (color) => setConfig(prev => ({ ...prev, fabricColor: color })),

      addFabric,
      addOption,
      addCustomization: addOption,
      removeFabric,
      removeOption,
      removeCustomization: removeOption,
      updateFabric,
      updateOption,
      updateCustomization: updateOption,

      updateMeasurements: (measurements) => setConfig(prev => ({
        ...prev,
        measurements: { ...prev.measurements, ...measurements }
      })),
      activeStep,
      setActiveStep,
      viewMode,
      setViewMode,
      totalPrice,
      loadProduct,
      productNotFound,
      is2DEnabled,

      styleGroups: options,
      productFabrics: fabrics,
    }}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomization must be used within CustomizationProvider');
  }
  return context;
}

export const useShirt = useCustomization; // Alias for backward compatibility
