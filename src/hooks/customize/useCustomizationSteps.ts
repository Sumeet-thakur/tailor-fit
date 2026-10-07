import { useState, useMemo } from 'react';
import { Layers, Sparkles, Ruler } from 'lucide-react';
import { useCustomization } from '@/context/CustomizationContext';

interface UseCustomizationStepsProps {
    product: any;
}

export function useCustomizationSteps({ product }: UseCustomizationStepsProps) {
    const {
        config,
        styleGroups,
        setOption,
        setFabric,
        updateMeasurements,
    } = useCustomization();

    const [activeStep, setActiveStep] = useState('fabric');

    const isShirt = !product || product.category === 'shirt';
    const optionGroups = product?.customizationOptions?.optionGroups || [];

    // Define steps based on category
    const steps = useMemo(() => {
        const baseSteps: { id: string; label: string; icon: any }[] = [{ id: 'fabric', label: 'Fabric', icon: Layers }];

        if (optionGroups.length > 0) {
            optionGroups.forEach((group: any) => {
                const category = group.category || group.id;
                baseSteps.push({
                    id: category, // Use category as ID for setOption
                    label: group.label || category,
                    icon: Sparkles,
                });
            });
        }

        // Always include style groups that exist in the DB for this product (Pants or legacy)
        if (Object.keys(styleGroups).length > 0) {
            Object.keys(styleGroups).forEach((key) => {
                if (key !== 'fabric' && !baseSteps.find(s => s.id === key)) {
                    // Capitalize the label
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    baseSteps.push({ id: key, label: label, icon: Sparkles });
                }
            });
        }



        baseSteps.push({ id: 'measurements', label: 'Measurements', icon: Ruler });
        return baseSteps.filter(step => step.id !== 'back');
    }, [optionGroups, isShirt, styleGroups]);

    const getStepOptions = (stepId: string) => {
        const group = optionGroups.find((g: any) => (g.category || g.id) === stepId);
        if (group?.options?.length) return group.options;

        return styleGroups[stepId] || [];
    };

    const getSelectedOption = (stepId: string) => {
        // Uniform access via config.styles, fallback to legacy
        return config.styles?.[stepId] || (config as any)[stepId] || null;
    };

    const handleSelectOption = (stepId: string, option: any) => {
        if (stepId === 'fabric') {
            setFabric(option);
        } else if (stepId === 'measurements') {
            updateMeasurements(option);
        } else {
            // Generic setOption handles everything
            setOption(stepId, option);
        }
    };

    return {
        activeStep,
        setActiveStep,
        steps,
        getStepOptions,
        getSelectedOption,
        handleSelectOption,
    };
}
