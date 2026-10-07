// Extracts styles object from 2D customization config. Used by cart builder, save design.
import type { CustomizationOption } from '@/types/shirt';

export interface StyleEntry {
  id: string;
  name: string;
  priceModifier: number;
}

const SHIRT_OPTION_KEYS = ['collar', 'cuff', 'pocket', 'button', 'sleeve', 'back', 'necktie', 'bowtie'] as const;

interface ConfigWithStyles {
  collar?: CustomizationOption | null;
  cuff?: CustomizationOption | null;
  pocket?: CustomizationOption | null;
  button?: CustomizationOption | null;
  sleeve?: CustomizationOption | null;
  back?: CustomizationOption | null;
  necktie?: CustomizationOption | null;
  bowtie?: CustomizationOption | null;
  styles?: Record<string, CustomizationOption | { id: string; name: string; priceModifier?: number } | null>;
}

export function mapConfigToStyles(config: ConfigWithStyles | null | undefined): Record<string, StyleEntry> {
  const styles: Record<string, StyleEntry> = {};
  if (!config) return styles;

  if (config.styles) {
    Object.entries(config.styles).forEach(([key, opt]) => {
      if (opt && typeof opt === 'object' && opt.id) {
        styles[key] = {
          id: opt.id,
          name: opt.name ?? opt.id,
          priceModifier: (opt as { priceModifier?: number }).priceModifier ?? 0,
        };
      }
    });
  }

  for (const key of SHIRT_OPTION_KEYS) {
    const opt = config[key as keyof ConfigWithStyles];
    if (opt && typeof opt === 'object' && 'id' in opt) {
      styles[key] = {
        id: opt.id,
        name: opt.name ?? opt.id,
        priceModifier: (opt as { priceModifier?: number }).priceModifier ?? 0,
      };
    }
  }

  return styles;
}
