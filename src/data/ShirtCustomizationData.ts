/**
 * Shirt Customization Data
 * 
 * Hardcoded asset paths for the shirt customization live preview system.
 * All paths reference the /shirt-style-customization/ folder structure.
 */

// Base path for all shirt customization assets
const BASE_PATH = '/shirt-style-customization';

// Available fabric colors
export const FABRIC_COLORS = ['white', 'champagne', 'light-blue', 'cobalt-blue', 'deep-blue'] as const;
export type FabricColor = typeof FABRIC_COLORS[number];

// Color display names
export const COLOR_NAMES: Record<FabricColor, string> = {
    'white': 'White',
    'champagne': 'Champagne',
    'light-blue': 'Light Blue',
    'cobalt-blue': 'Cobalt Blue',
    'deep-blue': 'Deep Blue',
};

// Fabric swatches
export const FABRIC_SWATCHES: Record<FabricColor, string> = {
    'white': `${BASE_PATH}/Fabric/white/swatch.png`,
    'champagne': `${BASE_PATH}/Fabric/champagne/swatch.png`,
    'light-blue': `${BASE_PATH}/Fabric/light-blue/swatch.png`,
    'cobalt-blue': `${BASE_PATH}/Fabric/cobalt-blue/swatch.png`,
    'deep-blue': `${BASE_PATH}/Fabric/deep-blue/swatch.png`,
};

// ========== FABRICS (Front Base) ==========
export interface FabricOption {
    id: string;
    name: string;
    color: FabricColor;
    image: string;
    previewImage: string;
    backPreviewImage: string;
    priceModifier: number;
}

export const FABRICS: FabricOption[] = FABRIC_COLORS.map(color => ({
    id: `fabric-${color}`,
    name: COLOR_NAMES[color],
    color,
    image: FABRIC_SWATCHES[color] || `${BASE_PATH}/Front/front-${color}.png`,
    previewImage: `${BASE_PATH}/Front/front-${color}.png`,
    backPreviewImage: `${BASE_PATH}/Back/back-${color}.png`,
    priceModifier: 0,
}));

// ========== COLLAR STYLES ==========
export interface CollarStyle {
    id: string;
    name: string;
    image: string;
    fabricPreviewImages: Record<FabricColor, string>;
    backFabricPreviewImages: Record<FabricColor, string>;
}

const COLLAR_STYLES_NAMES = [
    { id: 'button-down', name: 'Button Down' },
    { id: 'knet-collar', name: 'Knet Collar' },
    { id: 'new-knet', name: 'New Knet Collar' },
    { id: 'rounded-collar', name: 'Rounded Collar' },
    { id: 'stand-up-collar', name: 'Stand Up Collar' },
    { id: 'wing-collar', name: 'Wing Collar' },
];

export const COLLARS: CollarStyle[] = COLLAR_STYLES_NAMES.map(style => ({
    id: `collar-${style.id}`,
    name: style.name,
    image: `${BASE_PATH}/Front/Collar/white/${style.id}.png`,
    fabricPreviewImages: Object.fromEntries(
        FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Front/Collar/${color}/${style.id}.png`])
    ) as Record<FabricColor, string>,
    backFabricPreviewImages: Object.fromEntries(
        FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Back/Collar/back-collar-${color}.png`])
    ) as Record<FabricColor, string>,
}));

// ========== CUFF STYLES ==========
export interface CuffStyle {
    id: string;
    name: string;
    image: string;
    fabricPreviewImages: Record<FabricColor, string>;
}

const CUFF_STYLES_NAMES = [
    { id: 'double-squared', name: 'Double Squared' },
    { id: 'rounded-one-button', name: 'Rounded One Button' },
    { id: 'single-cuff-one-button', name: 'Single Cuff One Button' },
    { id: 'single-cuff-two-buttons', name: 'Single Cuff Two Buttons' },
    { id: 'two-button-cut', name: 'Two Button Cut' },
];

export const CUFFS: CuffStyle[] = CUFF_STYLES_NAMES.map(style => ({
    id: `cuff-${style.id}`,
    name: style.name,
    image: `${BASE_PATH}/Front/Cuffs/white/${style.id}.png`,
    fabricPreviewImages: Object.fromEntries(
        FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Front/Cuffs/${color}/${style.id}.png`])
    ) as Record<FabricColor, string>,
}));

// ========== SLEEVE OPTIONS ==========
export interface SleeveOption {
    id: string;
    name: string;
    image: string;
    isHalf: boolean;
    fabricPreviewImages: Record<FabricColor, string>;
    backFabricPreviewImages: Record<FabricColor, string>;
}

export const SLEEVES: SleeveOption[] = [
    {
        id: 'sleeve-full',
        name: 'Full Sleeves',
        image: `${BASE_PATH}/Front/Sleeves/white/sleeves-long.png`,
        isHalf: false,
        fabricPreviewImages: Object.fromEntries(
            FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Front/Sleeves/${color}/sleeves-long.png`])
        ) as Record<FabricColor, string>,
        backFabricPreviewImages: Object.fromEntries(
            FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Back/Sleeves/${color}/sleeves-long.png`])
        ) as Record<FabricColor, string>,
    },
    {
        id: 'sleeve-half',
        name: 'Half Sleeves',
        image: `${BASE_PATH}/Front/Sleeves/white/sleeves_short.png`,
        isHalf: true,
        fabricPreviewImages: Object.fromEntries(
            FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Front/Sleeves/${color}/sleeves_short.png`])
        ) as Record<FabricColor, string>,
        backFabricPreviewImages: Object.fromEntries(
            FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Back/Sleeves/${color}/sleeves_short.png`])
        ) as Record<FabricColor, string>,
    },
];

// ========== BUTTON OPTIONS ==========
export interface ButtonOption {
    id: string;
    name: string;
    image: string;
    previewImage: string;
}

const BUTTON_COLORS = ['black', 'blue', 'red', 'white'];

export const BUTTONS: ButtonOption[] = BUTTON_COLORS.map(color => ({
    id: `button-${color}`,
    name: color.charAt(0).toUpperCase() + color.slice(1),
    image: `${BASE_PATH}/Front/Buttons/${color}.png`,
    previewImage: `${BASE_PATH}/Front/Buttons/${color}.png`,
}));

// ========== NECKTIE OPTIONS ==========
export interface NecktieOption {
    id: string;
    name: string;
    image: string;
    previewImage: string;
}

const NECKTIE_STYLES = [
    { id: 'lazio-kera-tie', name: 'Lazio Kera Tie' },
    { id: 'lazio-lisard-tie', name: 'Lazio Lisard Tie' },
    { id: 'lazio-parma-tie', name: 'Lazio Parma Tie' },
];

export const NECKTIES: NecktieOption[] = NECKTIE_STYLES.map(style => ({
    id: `necktie-${style.id}`,
    name: style.name,
    image: `${BASE_PATH}/Front/Necktie/${style.id}.png`,
    previewImage: `${BASE_PATH}/Front/Necktie/${style.id}.png`,
}));

// ========== BOWTIE OPTIONS ==========
export interface BowtieOption {
    id: string;
    name: string;
    image: string;
    previewImage: string;
}

const BOWTIE_STYLES = [
    { id: 'essential-black-bowtie', name: 'Essential Black' },
    { id: 'floral-print-bowtie', name: 'Floral Print' },
    { id: 'robin-hood-bowtie', name: 'Robin Hood' },
];

export const BOWTIES: BowtieOption[] = BOWTIE_STYLES.map(style => ({
    id: `bowtie-${style.id}`,
    name: style.name,
    image: `${BASE_PATH}/Front/Bowtie/${style.id}.png`,
    previewImage: `${BASE_PATH}/Front/Bowtie/${style.id}.png`,
}));

// ========== CHEST POCKET OPTIONS ==========
export interface ChestPocketOption {
    id: string;
    name: string;
    image: string;
    fabricPreviewImages: Record<FabricColor, string>;
}

export const CHEST_POCKETS: ChestPocketOption[] = [
    {
        id: 'pocket-none',
        name: 'No Pocket',
        image: '',
        fabricPreviewImages: {} as Record<FabricColor, string>,
    },
    {
        id: 'pocket-standard',
        name: 'Standard Pocket',
        image: `${BASE_PATH}/Front/Chestpocket/white/standard.png`,
        fabricPreviewImages: Object.fromEntries(
            FABRIC_COLORS.map(color => [color, `${BASE_PATH}/Front/Chestpocket/${color}/standard.png`])
        ) as Record<FabricColor, string>,
    },
];

// ========== Z-INDEX ORDERING ==========
export const LAYER_Z_INDEX = {
    frontBase: 1,
    backBase: 1,
    sleeves: 60,
    placket: 70,
    cuffs: 130,
    collar: 140,
    backCollar: 140,
    chestPocket: 145,
    buttons: 150,
    necktie: 160,
    bowtie: 165,
} as const;

// ========== HELPER FUNCTIONS ==========

/**
 * Get preview image path for front base by color
 */
export function getFrontBasePath(color: FabricColor): string {
    return `${BASE_PATH}/Front/front-${color}.png`;
}

/**
 * Get preview image path for back base by color
 */
export function getBackBasePath(color: FabricColor): string {
    return `${BASE_PATH}/Back/back-${color}.png`;
}

/**
 * Get back collar image path by color (no style variations for back collar)
 */
export function getBackCollarPath(color: FabricColor): string {
    return `${BASE_PATH}/Back/Collar/back-collar-${color}.png`;
}

/**
 * Get default configuration
 */
export function getDefaultConfig() {
    return {
        fabric: FABRICS[0], // white
        collar: COLLARS[0], // first collar style
        cuff: CUFFS[0], // first cuff style
        sleeve: SLEEVES[0], // full sleeves
        button: null as ButtonOption | null,
        necktie: null as NecktieOption | null,
        bowtie: null as BowtieOption | null,
        pocket: CHEST_POCKETS[0], // no pocket
    };
}

// ========== ASSET PATH RESOLUTION HELPERS ==========
// These handle inconsistent file naming across different fabric colors

/**
 * Get sleeve file path - handles mixed naming conventions per color
 * white, cobalt-blue: use hyphen (sleeves-long.png)
 * champagne, light-blue, deep-blue: use underscore (sleeves_long.png)
 */
export function getSleevePath(color: FabricColor, isHalf: boolean, view: 'front' | 'back' = 'front'): string {
    const viewFolder = view === 'front' ? 'Front' : 'Back';

    // Colors with hyphen naming
    const hyphenColors: FabricColor[] = ['white', 'cobalt-blue'];
    const usesHyphen = hyphenColors.includes(color);

    const sleeveFile = isHalf
        ? 'sleeves_short.png'  // All colors use underscore for short
        : (usesHyphen ? 'sleeves-long.png' : 'sleeves_long.png');

    return `${BASE_PATH}/${viewFolder}/Sleeves/${color}/${sleeveFile}`;
}

/**
 * Get collar file path - handles different file naming per color
 * 
 * Only cobalt-blue has a special case: button-down-collar.png instead of button-down.png
 * All other colors use consistent naming: {style}.png
 */
export function getCollarPath(color: FabricColor, collarStyleId: string): string {
    // Extract base style from id (e.g., "collar-button-down" -> "button-down")
    const style = collarStyleId.replace('collar-', '');

    // Only cobalt-blue has button-down-collar.png, others use button-down.png
    if (color === 'cobalt-blue' && style === 'button-down') {
        return `${BASE_PATH}/Front/Collar/${color}/button-down-collar.png`;
    }

    // All collars use the style as filename
    return `${BASE_PATH}/Front/Collar/${color}/${style}.png`;
}

/**
 * Get cuff file path
 */
export function getCuffPath(color: FabricColor, cuffStyleId: string): string {
    const style = cuffStyleId.replace('cuff-', '');
    return `${BASE_PATH}/Front/Cuffs/${color}/${style}.png`;
}

/**
 * Get chest pocket path
 */
export function getChestPocketPath(color: FabricColor): string {
    return `${BASE_PATH}/Front/Chestpocket/${color}/standard.png`;
}

