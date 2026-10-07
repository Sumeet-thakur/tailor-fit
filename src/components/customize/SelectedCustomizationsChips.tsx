import { Sparkles } from 'lucide-react';

interface ShirtConfig {
  fabric?: { name: string };
  collar?: { name: string };
  cuff?: { name: string };
  pocket?: { name: string };
  button?: { name: string };
  sleeve?: { name: string };
  styles?: Record<string, { name: string } | null>;
}

interface SelectedCustomizationsChipsProps {
  config: ShirtConfig;
  isShirt: boolean;
  /** 'compact' = smaller chips (mobile), 'standard' = responsive with lg: sizing */
  variant?: 'compact' | 'standard';
  /** Max style chips to show for pants/other (non-shirt) */
  maxStyleChips?: number;
  className?: string;
}

export function SelectedCustomizationsChips({
  config,
  isShirt,
  variant = 'compact',
  maxStyleChips = 3,
  className = '',
}: SelectedCustomizationsChipsProps): JSX.Element {
  const isStandard = variant === 'standard';

  const chipBase = isStandard
    ? 'px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg text-[10px] lg:text-xs font-semibold border'
    : 'px-2 py-1 rounded-lg text-[10px] font-semibold border';

  const gapClass = isStandard ? 'gap-1.5 lg:gap-2' : 'gap-1.5';
  const labelGap = isStandard ? 'gap-1.5 lg:gap-2' : 'gap-1.5';
  const labelSize = isStandard ? 'text-[10px] lg:text-xs' : 'text-[10px]';
  const labelMargin = isStandard ? 'mb-2 lg:mb-3' : 'mb-2';

  return (
    <div className={className}>
      <p className={`${labelSize} font-bold text-foreground ${labelMargin} uppercase tracking-wider flex items-center ${labelGap}`}>
        <Sparkles className={isStandard ? 'w-3 h-3 lg:w-3.5 lg:h-3.5 text-primary' : 'w-3 h-3 text-primary'} />
        Selected Customizations
      </p>
      <div className={`flex flex-wrap ${gapClass}`}>
        {config.fabric && (
          <span className={`${chipBase} bg-primary/10 text-primary border-primary/20`}>
            {config.fabric.name}
          </span>
        )}
        {isShirt && config.collar && (
          <span className={`${chipBase} bg-accent/10 text-primary border-accent/20`}>
            {config.collar.name}
          </span>
        )}
        {isShirt && config.cuff && (
          <span className={`${chipBase} bg-primary/10 text-primary border-primary/20`}>
            {config.cuff.name}
          </span>
        )}
        {isShirt && config.button && (
          <span className={`${chipBase} bg-accent/10 text-primary border-accent/20`}>
            {config.button.name}
          </span>
        )}
        {isShirt && config.pocket && (
          <span className={`${chipBase} bg-primary/10 text-primary border-primary/20`}>
            {config.pocket.name}
          </span>
        )}
        {isShirt && config.sleeve && (
          <span className={`${chipBase} bg-accent/10 text-primary border-accent/20`}>
            {config.sleeve.name}
          </span>
        )}
        {!isShirt && config.styles &&
          Object.entries(config.styles)
            .slice(0, maxStyleChips)
            .map(([key, opt], idx) =>
              opt ? (
                <span
                  key={key}
                  className={`${chipBase} ${idx % 2 === 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent/10 text-primary border-accent/20'}`}
                >
                  {opt.name}
                </span>
              ) : null
            )}
      </div>
    </div>
  );
}
