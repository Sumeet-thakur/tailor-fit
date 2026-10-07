import { getImageUrl, getThumbnailImageUrl } from '@/utils/imageHelper';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Step {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface CustomizationStepsProps {
    steps: Step[];
    activeStep: string;
    onStepChange: (stepId: string) => void;
    variant?: 'vertical' | 'horizontal';
    getSelectedOption: (stepId: string) => any;
    className?: string;
}

export function CustomizationSteps({
    steps,
    activeStep,
    onStepChange,
    variant = 'vertical',
    getSelectedOption,
    className
}: CustomizationStepsProps) {
    return (
        <div
            className={cn(
                variant === 'vertical'
                    ? "flex flex-col w-34 px-3 py-3 gap-3 overflow-y-auto scrollbar-hide border-y-1 mt-2 mb-4 items-center"
                    : "flex flex-row items-center px-3 py-3 overflow-x-auto border-y-1 mt-2 mb-4 scrollbar-hide gap-3",
                className
            )}
        >
            {steps.map((step) => {
                const isActive = activeStep === step.id;
                const selectedOption = step.id !== 'fabric' && step.id !== 'measurements' ? getSelectedOption(step.id) : null;
                const thumbnail = selectedOption?.image || selectedOption?.previewImage;

                return (
                    <button
                        key={step.id}
                        onClick={() => onStepChange(step.id)}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-out border",
                            variant === 'vertical' ? "w-[90px] h-[80px] sm:w-[100px] sm:h-[90px] shrink-0" : "w-[80px] h-[75px] sm:w-[90px] sm:h-[85px] shrink-0",
                            isActive
                                ? "bg-primary text-white border-primary shadow-lg scale-105"
                                : "bg-white text-muted-foreground border-border/80 hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm"
                        )}
                    >
                        {thumbnail ? (
                            <img
                                src={getThumbnailImageUrl(thumbnail) || thumbnail}
                                alt=""
                                className={cn(
                                    "w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 rounded object-contain step-thumbnail-svg transition-all duration-300",
                                    isActive && "opacity-90 brightness-0 invert"
                                )}
                                style={{
                                    shapeRendering: 'geometricPrecision'
                                }}
                            />
                        ) : (
                            <step.icon strokeWidth={1.5} className={cn("w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 transition-all duration-300", isActive ? "text-white" : "text-muted-foreground")} />
                        )}
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight whitespace-nowrap">
                            {step.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
