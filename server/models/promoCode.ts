import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    maxUses: {
        type: Number,
        default: null, // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    validFrom: {
        type: Date,
        default: Date.now,
    },
    validUntil: {
        type: Date,
        default: null, // null = never expires
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
export default PromoCode;
