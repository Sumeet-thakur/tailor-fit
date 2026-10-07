import { useState, useEffect } from 'react';
import { Fabric3D, FabricCategory } from '@/types/fabric';
import { FABRIC_CATEGORIES } from '@/types/fabric';

interface Use3DConfigurationProps {
    fabrics: Fabric3D[];
    defaultFabricId?: string;
}

export function use3DConfiguration({ fabrics, defaultFabricId }: Use3DConfigurationProps) {
    const [selectedFabric, setSelectedFabric] = useState<Fabric3D | null>(null);
    const [activeCategory, setActiveCategory] = useState<FabricCategory | string>('');
    const [activeStep, setActiveStep] = useState<'fabric' | 'collar' | 'cuff' | 'pocket' | 'placket' | 'buttons' | 'monogram' | 'measurements'>('fabric');

    // Modular shirt options
    const [useModularModel, setUseModularModel] = useState(true);
    const [selectedCollar, setSelectedCollar] = useState('button-down');
    const [selectedCuff, setSelectedCuff] = useState('two-button-square');
    const [selectedPocket, setSelectedPocket] = useState('chest');
    const [selectedPlacket, setSelectedPlacket] = useState('front-placket');

    // Per-Component Details
    const [collarEdgeColor, setCollarEdgeColor] = useState<string>('#f8f9fa');
    const [collarStitchColor, setCollarStitchColor] = useState<string>('#f8f9fa');
    const [collarButtonColor, setCollarButtonColor] = useState<string>('#f8f9fa');

    const [cuffEdgeColor, setCuffEdgeColor] = useState<string>('#f8f9fa');
    const [cuffStitchColor, setCuffStitchColor] = useState<string>('#f8f9fa');
    const [cuffButtonColor, setCuffButtonColor] = useState<string>('#f8f9fa');

    const [placketEdgeColor, setPlacketEdgeColor] = useState<string>('#f8f9fa');
    const [placketStitchColor, setPlacketStitchColor] = useState<string>('#f8f9fa');
    const [placketButtonColor, setPlacketButtonColor] = useState<string>('#f8f9fa');

    const [pocketEdgeColor, setPocketEdgeColor] = useState<string>('#f8f9fa');
    const [pocketStitchColor, setPocketStitchColor] = useState<string>('#f8f9fa');

    // Independent fabric for different parts
    const [collarFabric, setCollarFabric] = useState<Fabric3D | null>(null);
    const [cuffFabric, setCuffFabric] = useState<Fabric3D | null>(null);
    const [placketFabric, setPlacketFabric] = useState<Fabric3D | null>(null);
    const [pocketFabric, setPocketFabric] = useState<Fabric3D | null>(null);

    // Monogram
    const [monogramText, setMonogramText] = useState<string>('');
    const [monogramFont, setMonogramFont] = useState<string>('serif');
    const [monogramColor, setMonogramColor] = useState<string>('#1e3a8a');
    const [monogramPosition, setMonogramPosition] = useState<string>('loc_monogram_chest_left');

    // Measurements
    const [measurements, setMeasurements] = useState<Record<string, string>>({});

    // Reset selectedFabric if it was deleted (no longer in fabrics list) or set initial
    useEffect(() => {
        if (fabrics.length === 0) {
            if (selectedFabric) setSelectedFabric(null);
            return;
        }

        // Initial selection if none selected
        if (!selectedFabric) {
            if (defaultFabricId) {
                const targetFabric = fabrics.find(f => f._id === defaultFabricId);
                if (targetFabric) {
                    setSelectedFabric(targetFabric);
                    setActiveCategory(targetFabric.category || 'solids');
                    return;
                }
            }
            setSelectedFabric(fabrics[0]);
            setActiveCategory(fabrics[0].category || 'solids');
            return;
        }

        // Check if selected fabric still exists
        if (!fabrics.some((f) => f._id === selectedFabric._id)) {
            setSelectedFabric(fabrics[0]);
            // setActiveCategory(fabrics[0].category);
        }
    }, [fabrics, selectedFabric]);

    return {
        selectedFabric, setSelectedFabric,
        activeCategory, setActiveCategory,
        activeStep, setActiveStep,
        useModularModel, setUseModularModel,
        selectedCollar, setSelectedCollar,
        selectedCuff, setSelectedCuff,
        selectedPocket, setSelectedPocket,
        selectedPlacket, setSelectedPlacket,
        collarEdgeColor, setCollarEdgeColor,
        collarStitchColor, setCollarStitchColor,
        collarButtonColor, setCollarButtonColor,
        cuffEdgeColor, setCuffEdgeColor,
        cuffStitchColor, setCuffStitchColor,
        cuffButtonColor, setCuffButtonColor,
        placketEdgeColor, setPlacketEdgeColor,
        placketStitchColor, setPlacketStitchColor,
        placketButtonColor, setPlacketButtonColor,
        pocketEdgeColor, setPocketEdgeColor,
        pocketStitchColor, setPocketStitchColor,
        collarFabric, setCollarFabric,
        cuffFabric, setCuffFabric,
        placketFabric, setPlacketFabric,
        pocketFabric, setPocketFabric,
        monogramText, setMonogramText,
        monogramFont, setMonogramFont,
        monogramColor, setMonogramColor,
        monogramPosition, setMonogramPosition,
        measurements, setMeasurements,
    };
}
