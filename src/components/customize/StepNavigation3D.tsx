import { Shirt, Box, Layers, Minus, Sparkles, Ruler, Type } from 'lucide-react';
import { COLLAR_OPTIONS, CUFF_OPTIONS, POCKET_OPTIONS, PLACKET_OPTIONS } from '@/constants/shirtOptions3D';

interface StepNavigation3DProps {
    activeStep: string;
    setActiveStep: (step: any) => void;
    showModularOptions?: boolean;
    selectedCollar?: string;
    selectedCuff?: string;
    selectedPocket?: string;
    selectedPlacket?: string;
}

export function StepNavigation3D({ 
    activeStep, 
    setActiveStep, 
    showModularOptions = true,
    selectedCollar,
    selectedCuff,
    selectedPocket,
    selectedPlacket
}: StepNavigation3DProps) {
    const collarIcon = COLLAR_OPTIONS.find(c => c.id === selectedCollar)?.image;
    const cuffIcon = CUFF_OPTIONS.find(c => c.id === selectedCuff)?.image;
    const pocketIcon = POCKET_OPTIONS.find(p => p.id === selectedPocket)?.image;
    const placketIcon = PLACKET_OPTIONS.find(p => p.id === selectedPlacket)?.image;
    const buttonIcon = '/assets/icons/button/default-button.svg';
    
    return (
        <div className="w-34 bg-white border-r-1 border-l-1 border-border/50 flex flex-col py-6 gap-3 z-10 hidden lg:flex shrink-0 h-full overflow-y-auto scrollbar-hide items-center">
            <button
                onClick={() => setActiveStep('fabric')}
                className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'fabric' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
            >
                <Shirt className="w-8 h-8 mb-2" strokeWidth={1.5} />
                <span className="text-xs font-medium">Fabric</span>
            </button>

            {showModularOptions && (
                <>
                    <button
                        onClick={() => setActiveStep('collar')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'collar' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        {collarIcon ? (
                            <img src={collarIcon} alt="Collar" className={`w-8 h-8 mb-2 object-contain opacity-80 ${activeStep === 'collar' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Box className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">Collar</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('cuff')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'cuff' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        {cuffIcon ? (
                            <img src={cuffIcon} alt="Cuff" className={`w-8 h-8 mb-2 object-contain opacity-80 ${activeStep === 'cuff' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Layers className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">Cuff</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('pocket')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'pocket' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        {pocketIcon ? (
                            <img src={pocketIcon} alt="Pocket" className={`w-8 h-8 mb-2 object-contain opacity-80 ${activeStep === 'pocket' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Box className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">Pocket</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('placket')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'placket' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        {placketIcon ? (
                            <img src={placketIcon} alt="Placket" className={`w-8 h-8 mb-2 object-contain opacity-80 ${activeStep === 'placket' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Minus className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">Placket</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('buttons')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'buttons' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        {buttonIcon ? (
                            <img src={buttonIcon} alt="Buttons" className={`w-8 h-8 mb-2 object-contain opacity-80 ${activeStep === 'buttons' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Sparkles className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">Buttons</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('monogram')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'monogram' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        <Type className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        <span className="text-xs font-medium">Monogram</span>
                    </button>
                    <button
                        onClick={() => setActiveStep('measurements')}
                        className={`flex flex-col items-center justify-center w-26 h-24 rounded-2xl transition-all duration-300 ease-out shadow-soft border ${activeStep === 'measurements' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-muted-foreground border hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm'}`}
                    >
                        <Ruler className="w-8 h-8 mb-2" strokeWidth={1.5} />
                        <span className="text-xs font-medium">Size</span>
                    </button>
                </>
            )}
        </div>
    );
}
