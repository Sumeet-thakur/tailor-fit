import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomizationSteps } from '@/hooks/customize/useCustomizationSteps';
import * as CustomizationContext from '@/context/CustomizationContext';

// Mock dependency
vi.mock('@/context/CustomizationContext', () => ({
    useCustomization: vi.fn(),
}));

const mockUseCustomization = CustomizationContext.useCustomization as any;

vi.mock('@/data/ShirtCustomizationData', () => ({
    CUFFS: [{ id: 'cuff1' }, { id: 'cuff2' }],
    COLLARS: [{ id: 'col1' }],
    getStyleGroupOptions: (category: string, group: string) => {
        if (group === 'cuff') return [{ id: 'cuff1' }, { id: 'cuff2' }];
        return [];
    }
}));

describe('useCustomizationSteps', () => {
    const mockProduct = {
        _id: 'prod1',
        category: 'shirt',
        customizationOptions: {
            optionGroups: [
                { id: 'collar', category: 'collar', name: 'Collar' },
                { id: 'cuff', category: 'cuff', name: 'Cuff' }
            ]
        }
    };

    const mockSetters = {
        setOption: vi.fn(),
        setFabric: vi.fn(),
        updateMeasurements: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCustomization.mockReturnValue({
            config: {
                styles: { collar: { id: 'c1' } },
                fabric: { id: 'f1' }
            },
            styleGroups: {
                collar: [{ id: 'c1', name: 'Collar 1' }, { id: 'c2', name: 'Collar 2' }],
                cuff: []
            }, // Mocking context styleGroups from DB
            ...mockSetters,
        });
    });

    it('should initialize with fabric step', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));
        expect(result.current.activeStep).toBe('fabric');
    });

    it('should generate steps based on shirt category / styleGroups', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));

        // Expect fabric, plus collar (since styleGroups.collar has items), and maybe others if fallback logic works
        const stepIds = result.current.steps.map(s => s.id);
        expect(stepIds).toContain('fabric');
        expect(stepIds).toContain('collar');
        expect(stepIds).toContain('measurements');

        // Cuff has empty styleGroups in mock, BUT shirt fallback might have data in ShirtData mock (if we didn't mock it here, it uses real ShirtData).
        // Since I am NOT mocking ShirtData in this test file (unlike ProductPreview), it imports real ShirtData.
        // Real ShirtData likely has cuffs.
        // So 'cuff' should be present.
    });

    it('should return options for a step', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));

        const options = result.current.getStepOptions('collar');
        // It prioritizes styleGroups from context
        expect(options).toHaveLength(2);
        expect(options[0].id).toBe('c1');
    });

    it('should return empty if styleGroups empty for shirt', () => {
        // Mock styleGroups empty for cuff
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));
        const options = result.current.getStepOptions('cuff');
        expect(options.length).toBe(0);
    });

    it('should handle fabric selection', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));
        const option = { id: 'f2' };

        act(() => {
            // Internal function calls setFabric if step is 'fabric' not exposed directly as 'handleSelectOption'?
            // Wait, hook returns handleSelectOption?
            // Yes: return { handleSelectOption ... }
            // But the code: const handleSelectOption = (stepId, option) => ...
            // Wait, looking at file content:
            // const handleSelectOption = (stepId: string, option: any) => { ... }
            // It takes stepId explicitly.
        });

        // Let's verify return values
        // const { handleSelectOption } = result.current; (Need to re-access current in act or after)

        act(() => {
            result.current.handleSelectOption('fabric', option);
        });

        expect(mockSetters.setFabric).toHaveBeenCalledWith(option);
    });

    it('should handle generic option selection', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));
        const option = { id: 'c2' };

        act(() => {
            result.current.handleSelectOption('collar', option);
        });

        expect(mockSetters.setOption).toHaveBeenCalledWith('collar', option);
    });

    it('should handle measurement update', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));
        const measurements = { neck: 16 };

        act(() => {
            result.current.handleSelectOption('measurements', measurements);
        });

        expect(mockSetters.updateMeasurements).toHaveBeenCalledWith(measurements);
    });

    it('should get selected option from config', () => {
        const { result } = renderHook(() => useCustomizationSteps({ product: mockProduct }));

        // Config has collar: { id: 'c1' }
        const selected = result.current.getSelectedOption('collar');
        expect(selected).toEqual({ id: 'c1' });
    });
});
