// ─── ID Generator (matches Admin Dashboard's Date.now() format) ───
let _idCounter = 0;
const genId = (prefix: 'f' | 'g' | 'o') => `${prefix}${Date.now() + (++_idCounter)}`;

// ─── Fabric definitions with timestamp-based numeric IDs ───
const fabrics = [
    { id: genId('f'), dir: 'navy-blue-karels', name: 'Navy Blue Karels', color: 'Navy', hex: '#000080', img: 'navy-blue-karels+comfort-stretch.jpg' },
    { id: genId('f'), dir: 'iron-gray-sicilion', name: 'Iron Gray Sicilion', color: 'Gray', hex: '#4a4a4a', img: 'iron-gray-sicilion+grey-melange.jpg' },
    { id: genId('f'), dir: 'black-sunders', name: 'Black Sunders', color: 'Black', hex: '#000000', img: 'black-sunders+comfort-stretch.jpg' },
    { id: genId('f'), dir: 'iron-gray-blazies', name: 'Iron Gray Blazies', color: 'Gray', hex: '#555555', img: 'iron-gray-blazies+comfort-stretch.jpg' },
    { id: genId('f'), dir: 'navy-blue-oberon', name: 'Navy Blue Oberon', color: 'Navy', hex: '#000085', img: 'navy-blue-oberon+twill.jpg' },
];

const createFabricLayersByView = (frontTemplate: string | null, backTemplate: string | null) => {
    const layers: Record<string, { front: string | null; back: string | null }> = {};
    fabrics.forEach(f => {
        layers[f.id] = {
            front: frontTemplate ? frontTemplate.replace('{{fabric}}', f.dir) : null,
            back: backTemplate ? backTemplate.replace('{{fabric}}', f.dir) : null
        };
    });
    return layers;
};

const createFabricLayers = (frontTemplate: string) => {
    const layers: Record<string, string> = {};
    fabrics.forEach(f => {
        layers[f.id] = frontTemplate.replace('{{fabric}}', f.dir);
    });
    return layers;
};

export const pantStyleProduct = {
    name: 'Bespoke 2D Pant',
    description: 'Premium custom tailored chinos with Italian fabrics.',
    categoryType: '2d',
    category: 'pants',
    basePrice: 5500,
    images: {
        baseImage: '/2d-pant-style-customization/base-image+navy-blue-oberon+slim-fit.png',
        backImage: '/2d-pant-style-customization/Back/Long Fit/Normal Fit/navy-blue-karels+normal-fit.png',
        thumbnailImage: '/2d-pant-style-customization/Fabrics/navy-blue-karels+comfort-stretch.jpg',
        fabricPreviewThumbnails: fabrics.filter(f => f.dir !== 'navy-blue-oberon').map(f => `/2d-pant-style-customization/Fabric Preview Thumbnails/${f.dir}+slim-fit.png`)
    },
    customizationOptions: {
        fabrics: fabrics.map((f, idx) => ({
            id: f.id,
            name: f.name,
            priceModifier: 0,
            imageUrl: `/2d-pant-style-customization/Fabrics/${f.img}`,
            image: `/2d-pant-style-customization/Fabrics/${f.img}`,
            previewImage: f.dir === 'navy-blue-oberon' ? null : `/2d-pant-style-customization/Fabric Preview Thumbnails/${f.dir}+slim-fit.png`,
            backPreviewImage: `/2d-pant-style-customization/Back/Long Fit/Normal Fit/${f.dir}+normal-fit.png`,
            color: f.color,
            colors: [f.hex],
            order: idx + 1,
            isDefault: idx === 0
        })),
        optionGroups: [
            {
                id: genId('g'), label: 'Fit', category: 'fit', order: 1,
                options: [
                    { id: genId('o'), name: 'Normal Fit', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fit thumbnails/normal-fit.svg', isDefault: true, layersByFabric: createFabricLayersByView('/2d-pant-style-customization/Front/Long Fit/Normal Fit/{{fabric}}+normal-fit.png', '/2d-pant-style-customization/Back/Long Fit/Normal Fit/{{fabric}}+normal-fit.png') },
                    { id: genId('o'), name: 'Slim Fit', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fit thumbnails/slim-fit.svg', layersByFabric: createFabricLayersByView('/2d-pant-style-customization/Front/Long Fit/Slim Fit/{{fabric}}+slim-fit.png', '/2d-pant-style-customization/Back/Long Fit/Slim Fit/{{fabric}}+slim-fit.png') }
                ]
            },
            {
                id: genId('g'), label: 'Belt', category: 'waist', order: 2,
                options: [
                    { id: genId('o'), name: 'No Belt', image: '/2d-pant-style-customization/Step Buttons thumbnails/Belts/no-belt.svg', isDefault: true, previewImage: null },
                    { id: genId('o'), name: 'Angelo Belt', image: '/2d-pant-style-customization/Step Buttons thumbnails/Belts/angelo-belts.png', priceModifier: 1500, layersByView: { front: '/2d-pant-style-customization/Front/Belt/Add/angelo+belts.png', back: null } },
                    { id: genId('o'), name: 'Sansone Belt', image: '/2d-pant-style-customization/Step Buttons thumbnails/Belts/sansone-belts.png', priceModifier: 1500, layersByView: { front: '/2d-pant-style-customization/Front/Belt/Add/sansone+belts.png', back: null } },
                    { id: genId('o'), name: 'Vecellio Belt', image: '/2d-pant-style-customization/Step Buttons thumbnails/Belts/vecellio-belts.png', priceModifier: 1500, layersByView: { front: '/2d-pant-style-customization/Front/Belt/Add/vecellio+belts.png', back: null } }
                ]
            },
            {
                id: genId('g'), label: 'Pleats', category: 'pleats', order: 3,
                options: [
                    { id: genId('o'), name: 'No Pleats', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Pleats thumbnails/export-2026-02-23 104807.svg', isDefault: true, previewImage: null },
                    { id: genId('o'), name: 'Single Pleat', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Pleats thumbnails/export-2026-02-23 104814.svg', layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Pleats/Pleats Single/{{fabric}}+pleats-single.png') },
                    { id: genId('o'), name: 'Double Pleat', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Pleats thumbnails/export-2026-02-23 104821.svg', layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Pleats/Double Pleats/{{fabric}}+pleats-double.png') }
                ]
            },
            {
                id: genId('g'), label: 'Cuffs', category: 'cuffs', order: 4,
                options: [
                    { id: genId('o'), name: 'No Cuffs', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Cuffs thumbnails/no-pant-cuffs.svg', isDefault: true, previewImage: null },
                    { id: genId('o'), name: 'Turn Up', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Cuffs thumbnails/with-pant-cuffs.svg', priceModifier: 300, layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Cuffs/With Pant Cuffs/{{fabric}}+cuffs.png') }
                ]
            },
            {
                id: genId('g'), label: 'Fastening', category: 'fastening', order: 5,
                options: [
                    { id: genId('o'), name: 'Centered Button', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fastening thumbnails/centered-fastening.svg', isDefault: true, layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Fastening/Centered/{{fabric}}+centered.png') },
                    { id: genId('o'), name: 'Off-Centered', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fastening thumbnails/off-centered-fastening.svg', layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Fastening/Off Centered/{{fabric}}+off-centered.png') },
                    { id: genId('o'), name: 'Off-Centered Buttonless', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fastening thumbnails/off-centered-buttonless-fastening.svg', layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Fastening/Off Centered Buttonless/{{fabric}}+off-centered-buttonless.png') },
                    { id: genId('o'), name: 'No Button', image: '/2d-pant-style-customization/Step Buttons thumbnails/Pant Fastening thumbnails/no-button-fastening.svg', layersByFabric: createFabricLayers('/2d-pant-style-customization/Front/Fastening/No Button/{{fabric}}+no-button.png') }
                ]
            },
            {
                id: genId('g'), label: 'Back Pockets', category: 'back-pockets', order: 6,
                options: [
                    { id: genId('o'), name: 'Patched', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/patched.svg', isDefault: true, layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Patched/{{fabric}}+patched.png') },
                    { id: genId('o'), name: 'Flap Pocket', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/flap-pockets.svg', layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Flap Pockets/{{fabric}}+flap-pockets.png') },
                    { id: genId('o'), name: 'Double Welted', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/double-welted-pocket-with-button.svg', layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Double Welted Pocket with Button/{{fabric}}+double-welted-pocket-with-button.png') },
                    { id: genId('o'), name: 'Patched x2', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/patched-x2.svg', layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Patched x2/{{fabric}}+patched-x2.png') },
                    { id: genId('o'), name: 'Flap Pocket x2', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/flap-pocket-x2.svg', layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Flap Pockets x2/{{fabric}}+flap-pockets-x2.png') },
                    { id: genId('o'), name: 'Double Welted x2', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/double-welted-pocket-with-button-x2.svg', layersByFabric: createFabricLayersByView(null, '/2d-pant-style-customization/Back/Back Pockets/Double Welted Pocket with Button x2/{{fabric}}+double-welted-with-button-x2.png') },
                    { id: genId('o'), name: 'No Pockets', image: '/2d-pant-style-customization/Step Buttons thumbnails/Back Pockets thumbnails/no-pockets.svg', previewImage: null }
                ]
            }
        ]
    },
    isActive: true
};
