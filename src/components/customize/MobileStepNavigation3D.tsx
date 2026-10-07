import { Shirt, Box, Layers, Minus, Sparkles, Ruler, Type } from 'lucide-react';
import { COLLAR_OPTIONS, CUFF_OPTIONS, POCKET_OPTIONS, PLACKET_OPTIONS } from '@/constants/shirtOptions3D';

interface MobileStepNavigation3DProps {
    activeStep: string;
    setActiveStep: (step: any) => void;
    showModularOptions?: boolean;
    selectedCollar?: string;
    selectedCuff?: string;
    selectedPocket?: string;
    selectedPlacket?: string;
}

export function MobileStepNavigation3D({ 
    activeStep, 
    setActiveStep, 
    showModularOptions = true,
    selectedCollar,
    selectedCuff,
    selectedPocket,
    selectedPlacket
}: MobileStepNavigation3DProps) {
    const collarIcon = COLLAR_OPTIONS.find(c => c.id === selectedCollar)?.image;
    const cuffIcon = CUFF_OPTIONS.find(c => c.id === selectedCuff)?.image;
    const pocketIcon = POCKET_OPTIONS.find(p => p.id === selectedPocket)?.image;
    const placketIcon = PLACKET_OPTIONS.find(p => p.id === selectedPlacket)?.image;
    const buttonIcon = '/assets/icons/button/default-button.svg';

    return (
        <div className="flex flex-row px-3 border-y-1 mt-2 mb-4 bg-transparent py-3 overflow-x-auto scrollbar-hide gap-3 shrink-0">
            <button
                onClick={() => setActiveStep('fabric')}
                className={`flex flex-col items-center border-border/50 justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out  shrink-0 border ${activeStep === 'fabric' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}
            >
                <Shirt className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'fabric' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Fabric</span>
            </button>

            {/* Step buttons for modular customization */}
            {showModularOptions && (
                <>
                    <button onClick={() => setActiveStep('collar')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'collar' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        {collarIcon ? (
                            <img src={collarIcon} alt="Collar" className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 object-contain opacity-80 ${activeStep === 'collar' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Box className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'collar' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Collar</span>
                    </button>
                    <button onClick={() => setActiveStep('cuff')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'cuff' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        {cuffIcon ? (
                            <img src={cuffIcon} alt="Cuff" className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 object-contain opacity-80 ${activeStep === 'cuff' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Layers className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'cuff' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Cuff</span>
                    </button>
                    <button onClick={() => setActiveStep('pocket')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'pocket' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        {pocketIcon ? (
                            <img src={pocketIcon} alt="Pocket" className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 object-contain opacity-80 ${activeStep === 'pocket' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Box className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'pocket' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Pocket</span>
                    </button>
                    <button onClick={() => setActiveStep('placket')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'placket' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        {placketIcon ? (
                            <img src={placketIcon} alt="Placket" className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 object-contain opacity-80 ${activeStep === 'placket' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Minus className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'placket' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Placket</span>
                    </button>
                    <button onClick={() => setActiveStep('buttons')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'buttons' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        {buttonIcon ? (
                            <img src={buttonIcon} alt="Buttons" className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 object-contain opacity-80 ${activeStep === 'buttons' ? 'brightness-0 invert' : ''}`} />
                        ) : (
                            <Sparkles className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'buttons' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Buttons</span>
                    </button>
                    <button onClick={() => setActiveStep('monogram')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'monogram' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        <Type className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'monogram' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Monogram</span>
                    </button>
                    <button onClick={() => setActiveStep('measurements')} className={`flex flex-col items-center justify-center w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] rounded-2xl transition-all duration-300 ease-out shadow-soft shrink-0 border ${activeStep === 'measurements' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-gray-50 text-muted-foreground border-border/80 hover:bg-gray-100 hover:border-border'}`}>
                        <Ruler className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${activeStep === 'measurements' ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">Size</span>
                    </button>
                </>
            )}
        </div>
    );
}
