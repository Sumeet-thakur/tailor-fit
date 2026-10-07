
const BASE_PATH = '/shirt-style-customization';
const STEP_ICONS = '/2d-shirt-style-customization/Step Buttons thumbnails';

// ─── ID Generator (matches Admin Dashboard's Date.now() format) ───
let _idCounter = 0;
const genId = (prefix: 'f' | 'g' | 'o') => `${prefix}${Date.now() + (++_idCounter)}`;

// ─── Fabric definitions with timestamp-based numeric IDs ───
const FABRICS = [
    { id: genId('f'), color: 'white', name: 'White', hex: '#FFFFFF', image: 'white+mayfield-cotton-year-round.jpg', tags: ['classic', 'formal'] },
    { id: genId('f'), color: 'champagne', name: 'Champagne', hex: '#F7E7CE', image: 'champagne+bertram-cotton-year-round.jpg', tags: ['elegant', 'formal'] },
    { id: genId('f'), color: 'cobalt-blue', name: 'Cobalt Blue', hex: '#0047AB', image: 'cobalt-blue+declan-cotton.jpg', tags: ['bold', 'business'] },
    { id: genId('f'), color: 'deep-blue', name: 'Deep Blue', hex: '#00008B', image: 'deep-blue+bort-year-round.jpg', tags: ['formal', 'business'] },
    { id: genId('f'), color: 'light-blue', name: 'Light Blue', hex: '#ADD8E6', image: 'light-blue+cranbins-oxford-cotton.jpg', tags: ['classic', 'business'] },
];

// Helper to create fabric preview images mapping (keyed by numeric fabric ID)
const createFabricPreviewImages = (category: string, filename: string, subFolder: string | null = null) => {
    const mapping: Record<string, string> = {};
    FABRICS.forEach(f => {
        if (category === 'Sleeves') {
            const folder = filename.includes('short') ? 'Short' : 'Long';
            mapping[f.id] = `${BASE_PATH}/Front/${category}/${folder}/${f.color}+${filename}`;
        } else if (category === 'Collar') {
            mapping[f.id] = `${BASE_PATH}/Front/${category}/${subFolder}/${f.color}+${filename}`;
        } else if (category === 'Cuffs') {
            mapping[f.id] = `${BASE_PATH}/Front/${category}/${subFolder}/${f.color}+${filename}`;
        } else if (category === 'Chestpocket') {
            mapping[f.id] = `${BASE_PATH}/Front/${category}/${f.color}+${filename}`;
        } else {
            mapping[f.id] = `${BASE_PATH}/Front/${category}/${f.color}+${filename}`;
        }
    });
    return mapping;
};

// Helper to create back fabric preview images
const createBackFabricPreviewImages = (sleeveType: string) => {
    const mapping: Record<string, string> = {};
    const filename = sleeveType === 'long' ? 'sleeves-long.png' : 'sleeves-short.png';
    const folder = sleeveType === 'long' ? 'Long' : 'Short';

    FABRICS.forEach(f => {
        mapping[f.id] = `${BASE_PATH}/Back/Sleeves/${folder}/${f.color}+${filename}`;
    });
    return mapping;
};

// Helper to create back collar fabric preview images
const createBackCollarFabricPreviewImages = () => {
    const mapping: Record<string, string> = {};
    FABRICS.forEach(f => {
        mapping[f.id] = `${BASE_PATH}/Back/Collar/${f.color}+back-collar.png`;
    });
    return mapping;
};

export const shirtStyleProduct = {
    name: 'Custom Tailored Shirt',
    description: 'Premium custom-tailored shirt with multiple fabric colors and customization options.',
    category: 'shirt',
    basePrice: 8500,
    images: {
        baseImage: '/2d-shirt-style-customization/base-image+cobalt-blue.png',
        backImage: `${BASE_PATH}/Back/Sleeves/Long/white+sleeves-long.png`,
        thumbnailImage: '/2d-shirt-style-customization/base-image+cobalt-blue.png',
        fabricPreviewThumbnails: [
            `${BASE_PATH}/Fabric Preview Thumbnails/white+front.png`,
            `${BASE_PATH}/Fabric Preview Thumbnails/champagne+front.png`,
            `${BASE_PATH}/Fabric Preview Thumbnails/deep-blue+front.png`,
            `${BASE_PATH}/Fabric Preview Thumbnails/light-blue+front.png`
        ]
    },
    customizationOptions: {
        fabrics: FABRICS.map((f, idx) => ({
            id: f.id,
            name: f.name,
            image: `${BASE_PATH}/Fabrics/${f.image}`,
            imageUrl: `${BASE_PATH}/Fabrics/${f.image}`,
            previewImage: `${BASE_PATH}/Front/Front Preview/${f.color}+front.png`,
            backPreviewImage: `${BASE_PATH}/Back/Back Preview/${f.color}+back.png`,
            priceModifier: [0, 200, 300, 300, 200][idx],
            isDefault: idx === 0,
            order: idx,
            tags: f.tags,
            colors: [f.hex]
        })),
        optionGroups: [
            // SLEEVES
            {
                id: genId('g'),
                label: 'Sleeves',
                category: 'sleeve',
                order: 0,
                zIndex: 10,
                options: [
                    {
                        id: genId('o'),
                        name: 'Full Sleeves',
                        category: 'sleeve',
                        image: `${STEP_ICONS}/Sleeves/long-sleeve.svg`,
                        previewImage: `${BASE_PATH}/Fabric Preview Thumbnails/white+front.png`,
                        fabricPreviewImages: createFabricPreviewImages('Sleeves', 'sleeves-long.png'),
                        backFullFabricPreviewImages: createBackFabricPreviewImages('long'),
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 10,
                        description: 'Full length sleeves'
                    },
                    {
                        id: genId('o'),
                        name: 'Half Sleeves',
                        category: 'sleeve',
                        image: `${STEP_ICONS}/Sleeves/short-sleeve.svg`,
                        previewImage: `${BASE_PATH}/Front/Sleeves/Short/white+sleeves-short.png`,
                        fabricPreviewImages: createFabricPreviewImages('Sleeves', 'sleeves-short.png'),
                        backFullFabricPreviewImages: createBackFabricPreviewImages('short'),
                        priceModifier: -500,
                        order: 1,
                        zIndex: 10,
                        description: 'Half length sleeves for casual wear'
                    }
                ]
            },
            // COLLAR STYLES
            {
                id: genId('g'),
                label: 'Collar',
                category: 'collar',
                order: 1,
                zIndex: 140,
                options: [
                    {
                        id: genId('o'),
                        name: 'Button Down',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/button-down.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/Button Down/white+button-down.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'button-down.png', 'Button Down'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 140,
                        description: 'Classic button down collar'
                    },
                    {
                        id: genId('o'),
                        name: 'Knet Collar',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/knet-collar.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/Knet/white+knet.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'knet.png', 'Knet'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 200,
                        order: 1,
                        zIndex: 140,
                        description: 'Modern knet collar style'
                    },
                    {
                        id: genId('o'),
                        name: 'New Knet Collar',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/new-knet.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/New Knet/white+new-knet.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'new-knet.png', 'New Knet'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 250,
                        order: 2,
                        zIndex: 140,
                        description: 'Updated knet collar design'
                    },
                    {
                        id: genId('o'),
                        name: 'Rounded Collar',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/rounded.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/Rounded/white+rounded.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'rounded.png', 'Rounded'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 150,
                        order: 3,
                        zIndex: 140,
                        description: 'Soft rounded collar'
                    },
                    {
                        id: genId('o'),
                        name: 'Stand Up Collar',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/stand-up.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/Stand Up/white+stand-up.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'stand-up.png', 'Stand Up'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 300,
                        order: 4,
                        zIndex: 140,
                        description: 'Modern stand-up collar'
                    },
                    {
                        id: genId('o'),
                        name: 'Wing Collar',
                        category: 'collar',
                        image: `${STEP_ICONS}/Shirt Collar thumbnails/wing.svg`,
                        previewImage: `${BASE_PATH}/Front/Collar/Wing/white+wing.png`,
                        fabricPreviewImages: createFabricPreviewImages('Collar', 'wing.png', 'Wing'),
                        backFullFabricPreviewImages: createBackCollarFabricPreviewImages(),
                        priceModifier: 350,
                        order: 5,
                        zIndex: 140,
                        description: 'Formal wing collar for special occasions'
                    }
                ]
            },
            // CUFF STYLES
            {
                id: genId('g'),
                label: 'Cuffs',
                category: 'cuff',
                order: 2,
                zIndex: 130,
                options: [
                    {
                        id: genId('o'),
                        name: 'Double Squared',
                        category: 'cuff',
                        image: `${STEP_ICONS}/Shirt Cuffs thumbnails/double-squared.svg`,
                        previewImage: `${BASE_PATH}/Front/Cuffs/Double Squared/white+double-squared.png`,
                        fabricPreviewImages: createFabricPreviewImages('Cuffs', 'double-squared.png', 'Double Squared'),
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 130,
                        description: 'Double squared cuff design'
                    },
                    {
                        id: genId('o'),
                        name: 'Rounded One Button',
                        category: 'cuff',
                        image: `${STEP_ICONS}/Shirt Cuffs thumbnails/rounded-1-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Cuffs/Rounded One Button/white+rounded-one-button.png`,
                        fabricPreviewImages: createFabricPreviewImages('Cuffs', 'rounded-one-button.png', 'Rounded One Button'),
                        priceModifier: 100,
                        order: 1,
                        zIndex: 130,
                        description: 'Rounded cuff with single button'
                    },
                    {
                        id: genId('o'),
                        name: 'Single Cuff One Button',
                        category: 'cuff',
                        image: `${STEP_ICONS}/Shirt Cuffs thumbnails/single-cuff-1-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Cuffs/Single Cuff One Button/white+single-cuff-one-button.png`,
                        fabricPreviewImages: createFabricPreviewImages('Cuffs', 'single-cuff-one-button.png', 'Single Cuff One Button'),
                        priceModifier: 50,
                        order: 2,
                        zIndex: 130,
                        description: 'Single cuff with one button'
                    },
                    {
                        id: genId('o'),
                        name: 'Single Cuff Two Buttons',
                        category: 'cuff',
                        image: `${STEP_ICONS}/Shirt Cuffs thumbnails/single-cuff-2-buttons.svg`,
                        previewImage: `${BASE_PATH}/Front/Cuffs/Single Cuff Two Buttons/white+single-cuff-two-buttons.png`,
                        fabricPreviewImages: createFabricPreviewImages('Cuffs', 'single-cuff-two-buttons.png', 'Single Cuff Two Buttons'),
                        priceModifier: 100,
                        order: 3,
                        zIndex: 130,
                        description: 'Single cuff with two buttons'
                    },
                    {
                        id: genId('o'),
                        name: 'Two Button Cut',
                        category: 'cuff',
                        image: `${STEP_ICONS}/Shirt Cuffs thumbnails/two-button-cut.svg`,
                        previewImage: `${BASE_PATH}/Front/Cuffs/Two Buttons Cut/white+two-button-cut.png`,
                        fabricPreviewImages: createFabricPreviewImages('Cuffs', 'two-button-cut.png', 'Two Buttons Cut'),
                        priceModifier: 150,
                        order: 4,
                        zIndex: 130,
                        description: 'Two button cut style cuff'
                    }
                ]
            },
            // CHEST POCKET
            {
                id: genId('g'),
                label: 'Chest Pocket',
                category: 'pocket',
                order: 3,
                zIndex: 145,
                options: [
                    {
                        id: genId('o'),
                        name: 'No Pocket',
                        category: 'pocket',
                        image: '/2d-shirt-style-customization/Step Buttons thumbnails/Front Pocket/no-pocket.svg',
                        previewImage: null,
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 145,
                        description: 'Clean front without pocket'
                    },
                    {
                        id: genId('o'),
                        name: 'Standard Pocket',
                        category: 'pocket',
                        image: `${STEP_ICONS}/Front Pocket/standard-pocket.svg`,
                        previewImage: `${BASE_PATH}/Front/Chestpocket/white+standard-chest-pocket.png`,
                        fabricPreviewImages: createFabricPreviewImages('Chestpocket', 'standard-chest-pocket.png'),
                        priceModifier: 200,
                        order: 1,
                        zIndex: 145,
                        description: 'Standard chest pocket'
                    }
                ]
            },
            // BUTTONS
            {
                id: genId('g'),
                label: 'Buttons',
                category: 'button',
                order: 4,
                zIndex: 150,
                options: [
                    {
                        id: genId('o'),
                        name: 'White Buttons',
                        category: 'button',
                        image: `${STEP_ICONS}/Shirt Buttons thumbnails/default-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Buttons/white+buttons.png`,
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 150,
                        description: 'Classic white buttons'
                    },
                    {
                        id: genId('o'),
                        name: 'Black Buttons',
                        category: 'button',
                        image: `${STEP_ICONS}/Shirt Buttons thumbnails/custom-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Buttons/black+buttons.png`,
                        priceModifier: 100,
                        order: 1,
                        zIndex: 150,
                        description: 'Sophisticated black buttons'
                    },
                    {
                        id: genId('o'),
                        name: 'Blue Buttons',
                        category: 'button',
                        image: `${STEP_ICONS}/Shirt Buttons thumbnails/custom-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Buttons/blue+buttons.png`,
                        priceModifier: 100,
                        order: 2,
                        zIndex: 150,
                        description: 'Elegant blue buttons'
                    },
                    {
                        id: genId('o'),
                        name: 'Red Buttons',
                        category: 'button',
                        image: `${STEP_ICONS}/Shirt Buttons thumbnails/custom-button.svg`,
                        previewImage: `${BASE_PATH}/Front/Buttons/red+buttons.png`,
                        priceModifier: 100,
                        order: 3,
                        zIndex: 150,
                        description: 'Bold red buttons'
                    }
                ]
            },
            // NECKTIE
            {
                id: genId('g'),
                label: 'Necktie',
                category: 'necktie',
                order: 5,
                zIndex: 160,
                options: [
                    {
                        id: genId('o'),
                        name: 'No Necktie',
                        category: 'necktie',
                        image: '/2d-shirt-style-customization/Step Buttons thumbnails/Tie/without-tie.svg',
                        previewImage: null,
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 160,
                        description: 'No necktie'
                    },
                    {
                        id: genId('o'),
                        name: 'Lazio Kera Tie',
                        category: 'necktie',
                        image: `${STEP_ICONS}/Tie/add-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Necktie/lazio-kera+necktie.png`,
                        priceModifier: 800,
                        order: 1,
                        zIndex: 160,
                        description: 'Elegant Lazio Kera pattern tie'
                    },
                    {
                        id: genId('o'),
                        name: 'Lazio Lisard Tie',
                        category: 'necktie',
                        image: `${STEP_ICONS}/Tie/add-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Necktie/lazio-lisard+necktie.png`,
                        priceModifier: 850,
                        order: 2,
                        zIndex: 160,
                        description: 'Stylish Lazio Lisard pattern tie'
                    },
                    {
                        id: genId('o'),
                        name: 'Lazio Parma Tie',
                        category: 'necktie',
                        image: `${STEP_ICONS}/Tie/add-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Necktie/lazio-parma+necktie.png`,
                        priceModifier: 900,
                        order: 3,
                        zIndex: 160,
                        description: 'Premium Lazio Parma pattern tie'
                    }
                ]
            },
            // BOWTIE
            {
                id: genId('g'),
                label: 'Bowtie',
                category: 'bowtie',
                order: 6,
                zIndex: 165,
                options: [
                    {
                        id: genId('o'),
                        name: 'No Bowtie',
                        category: 'bowtie',
                        image: '/2d-shirt-style-customization/Step Buttons thumbnails/Bowtie/no-bow-tie.svg',
                        previewImage: null,
                        priceModifier: 0,
                        isDefault: true,
                        order: 0,
                        zIndex: 165,
                        description: 'No bowtie'
                    },
                    {
                        id: genId('o'),
                        name: 'Essential Black Bowtie',
                        category: 'bowtie',
                        image: `${STEP_ICONS}/Bowtie/custom-bow-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Bowtie/essential-black+bowtie.png`,
                        priceModifier: 600,
                        order: 1,
                        zIndex: 165,
                        description: 'Classic black bowtie'
                    },
                    {
                        id: genId('o'),
                        name: 'Floral Print Bowtie',
                        category: 'bowtie',
                        image: `${STEP_ICONS}/Bowtie/custom-bow-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Bowtie/floral-print+bowtie.png`,
                        priceModifier: 700,
                        order: 2,
                        zIndex: 165,
                        description: 'Floral pattern bowtie'
                    },
                    {
                        id: genId('o'),
                        name: 'Robin Hood Bowtie',
                        category: 'bowtie',
                        image: `${STEP_ICONS}/Bowtie/custom-bow-tie.svg`,
                        previewImage: `${BASE_PATH}/Front/Bowtie/robin-hood+bowtie.png`,
                        priceModifier: 650,
                        order: 3,
                        zIndex: 165,
                        description: 'Unique Robin Hood style bowtie'
                    }
                ]
            }

        ]
    },
    isActive: true
};

// Z-Index reference for layer stacking
export const LAYER_ZINDEX = {
    sleeve: 10,
    cuff: 130,
    collar: 140,
    pocket: 145,
    button: 150,
    necktie: 160,
    bowtie: 165,
    back: 200
};

export default shirtStyleProduct;
