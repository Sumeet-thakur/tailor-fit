
export const MEASUREMENT_LABELS: Record<string, string> = {
    neck: 'Neck / Collar',
    chest: 'Chest',
    waist: 'Waist',
    hips: 'Hips',
    shoulder: 'Shoulder Width',
    sleeveLength: 'Sleeve Length',
    shirtLength: 'Shirt Length',
    bicep: 'Bicep / Armhole',
    wrist: 'Wrist / Cuff',
    thigh: 'Thigh',
    knee: 'Knee',
    legOpening: 'Leg Opening',
    rise: 'Rise',
    inseam: 'Inseam',
    outseam: 'Outseam',
    jacketLength: 'Jacket Length',
    pantLength: 'Pant Length',
    seat: 'Seat',
    lapelWidth: 'Lapel Width'
};

export const SHIRT_MEASUREMENTS = [
    'neck',
    'chest',
    'waist',
    'hips',
    'shoulder',
    'sleeveLength',
    'shirtLength',
    'bicep',
    'wrist'
];

export const PANT_MEASUREMENTS = [
    'waist',
    'hips',
    'rise',
    'inseam',
    'outseam',
    'thigh',
    'knee',
    'legOpening'
];

export const SUIT_MEASUREMENTS = [
    ...SHIRT_MEASUREMENTS,
    'jacketLength',
    'lapelWidth',
    ...PANT_MEASUREMENTS
];

export const getMeasurementFields = (category?: string): string[] => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('pant') || cat.includes('trouser')) {
        return PANT_MEASUREMENTS;
    }
    if (cat.includes('suit') || cat.includes('coat') || cat.includes('blazer')) {
        return SUIT_MEASUREMENTS;
    }
    // Default to shirt for now as it's the primary product, or if specifically shirt
    return SHIRT_MEASUREMENTS;
};

export const getMeasurementLabel = (key: string): string => {
    return MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
};
