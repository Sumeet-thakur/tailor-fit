import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceModifier } from '@/lib/formatPrice';

describe('formatPrice', () => {
    it('should format numbers correctly as PKR', () => {
        expect(formatPrice(1000)).toContain('PKR');
        expect(formatPrice(1000)).toContain('1,000');
        expect(formatPrice(500)).toBe('PKR 500');
    });

    it('should handle string inputs', () => {
        expect(formatPrice('2500')).toContain('2,500');
    });

    it('should handle zero', () => {
        expect(formatPrice(0)).toBe('PKR 0');
    });

    it('should return PKR 0 for null or undefined', () => {
        expect(formatPrice(null)).toBe('PKR 0');
        expect(formatPrice(undefined)).toBe('PKR 0');
    });

    it('should return PKR 0 for invalid numbers', () => {
        expect(formatPrice('abc')).toBe('PKR 0');
    });
});

describe('formatPriceModifier', () => {
    it('should format positive modifiers with a plus sign', () => {
        expect(formatPriceModifier(500)).toContain('+PKR 500');
    });

    it('should format negative modifiers with a minus sign', () => {
        expect(formatPriceModifier(-200)).toContain('-PKR 200');
    });

    it('should handle string inputs', () => {
        expect(formatPriceModifier('300')).toContain('+PKR 300');
    });

    it('should return empty string for null/undefined/invalid', () => {
        expect(formatPriceModifier(null)).toBe('');
        expect(formatPriceModifier(undefined)).toBe('');
        expect(formatPriceModifier('abc')).toBe('');
    });
});
