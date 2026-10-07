// [Homepage] Shop by Fabric Section
// [Action] Shows a large product preview center-left + vertical fabric swatch rail on the right
// [Purpose] Main visual highlight of the homepage — interactive, premium, and fully responsive
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shirt, Scissors, ChevronUp, ChevronDown } from 'lucide-react';
import { Product } from '@/types/product';
import { getImageUrl, getProductImageUrl } from '@/utils/imageHelper';
import { getProductPlaceholder } from '@/lib/placeholders';
import { getFabricThumbnailUrl } from '@/services/fabricService';

/* ─────────────────────────── Types ─────────────────────────── */

interface FabricSwatch {
    id: string;
    name: string;
    color: string;
    textureUrl: string;
    previewImage: string;
    productLink: string;
}

interface ShopByFabricProps {
    products: Product[];
    fabrics: any[];
}

type CategoryFilter = 'shirt' | 'pants';

const CATEGORY_CONFIG: Record<CategoryFilter, { label: string; icon: typeof Shirt }> = {
    shirt: { label: 'Shirts', icon: Shirt },
    pants: { label: 'Pants', icon: Scissors },
};

/* ─────────────────────── Color Helpers ──────────────────────── */

function deriveFabricColor(fabric: any): string {
    if (fabric.baseColor && fabric.baseColor.startsWith('#')) return fabric.baseColor;
    if (fabric.color && fabric.color.startsWith('#')) return fabric.color;
    const nameMap: Record<string, string> = {
        white: '#F5F0EB', champagne: '#F2E6D9', 'light-blue': '#B8D4E3',
        'cobalt-blue': '#1F3A5F', 'deep-blue': '#0D1B2A', navy: '#1B2A4A',
        black: '#1A1A1A', charcoal: '#36454F', grey: '#7D8491', gray: '#7D8491',
        beige: '#D4C5A9', cream: '#FFFDD0', khaki: '#C3B091', brown: '#6B4226',
        red: '#C0392B', denim: '#3B5998', linen: '#C4A484', satin: '#F5E6D3',
        wool: '#2C3E50', cotton: '#E8E8E8', silk: '#F5E6D3',
    };
    const lower = (fabric.name || '').toLowerCase();
    for (const [key, hex] of Object.entries(nameMap)) {
        if (lower.includes(key)) return hex;
    }
    return '#D4C5A9';
}

function softenHex(hex: string, lightness = 95): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 30)}%, ${lightness}%)`;
}

/* ──────────────────── Swatch Building ──────────────────────── */

function buildSwatchesFromGlobalFabrics(fabrics: any[], product: Product | undefined): FabricSwatch[] {
    if (fabrics.length === 0) return [];
    const productImage = product?.images?.baseImage || '';
    const productCategory = product?.category || 'shirt';
    const productLink = product
        ? `/${product.categoryType === '3d' ? 'customize-3d' : 'customize'}/${product.slug || product._id}`
        : '/products';

    return fabrics
        .filter(f => f.isActive !== false)
        .map((f, i) => {
            const thumbUrl = getFabricThumbnailUrl(f) || f.thumbnailUrl || f.colorMapUrl || '';
            let index = product?.fabricIds
                ? product.fabricIds.findIndex((id: any) => String(id) === String(f._id || f.id))
                : -1;
            if (index === -1) index = i;
            const previewImgStr = product?.images?.fabricPreviewThumbnails?.[index] || productImage;
            return {
                id: f._id,
                name: f.name,
                color: deriveFabricColor(f),
                textureUrl: getImageUrl(thumbUrl) || thumbUrl,
                previewImage: getProductImageUrl(previewImgStr, productCategory),
                productLink: `${productLink}?fabric=${f._id}`,
            };
        });
}

function buildSwatchesFrom2D(product: Product): FabricSwatch[] {
    const fabrics = product.customizationOptions?.fabrics || [];
    if (fabrics.length === 0) return [];
    return fabrics.map((f: any, i: number) => {
        const textureUrl = getFabricThumbnailUrl(f, true) || f.imageUrl || f.image || f.previewImage || '';
        const previewImage = product.images?.fabricPreviewThumbnails?.[i] || f.previewImage || product.images?.baseImage || '';
        return {
            id: f.id,
            name: f.name || 'Fabric',
            color: f.color || deriveFabricColor(f),
            textureUrl: textureUrl ? (getImageUrl(textureUrl) || textureUrl) : '',
            previewImage: getProductImageUrl(previewImage, product.category),
            productLink: `/customize/${product.slug || product._id}?fabric=${f.id}`,
        };
    });
}

/* ──────────────────────── Component ────────────────────────── */

export default function ShopByFabric({ products, fabrics }: ShopByFabricProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('shirt');
    const [activeFabricIdx, setActiveFabricIdx] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false); // for smooth category switching
    const [swatchScrollOffset, setSwatchScrollOffset] = useState(0); // for vertical swatch rail pagination
    const railRef = useRef<HTMLDivElement>(null);

    // Categorize products
    const productByCategory = useMemo(() => {
        const result: Record<CategoryFilter, Product | undefined> = { shirt: undefined, pants: undefined };
        for (const p of products) {
            const cat = p.category as CategoryFilter;
            if (cat === 'shirt' && !result.shirt) result.shirt = p;
            if (cat === 'pants' && !result.pants) result.pants = p;
        }
        return result;
    }, [products]);

    // Build swatches — prefer 3D fabrics, fall back to 2D inline
    const swatchesByCategory = useMemo(() => {
        const result: Record<CategoryFilter, FabricSwatch[]> = { shirt: [], pants: [] };
        const safeFabrics = fabrics || [];
        
        if (safeFabrics.length > 0 && productByCategory.shirt?.categoryType === '3d') {
            result.shirt = buildSwatchesFromGlobalFabrics(safeFabrics, productByCategory.shirt);
        }
        if (result.shirt.length === 0 && productByCategory.shirt) {
            result.shirt = buildSwatchesFrom2D(productByCategory.shirt);
        }
        if (safeFabrics.length > 0 && productByCategory.pants?.categoryType === '3d') {
            result.pants = buildSwatchesFromGlobalFabrics(safeFabrics, productByCategory.pants);
        }
        if (result.pants.length === 0 && productByCategory.pants) {
            result.pants = buildSwatchesFrom2D(productByCategory.pants);
        }
        return result;
    }, [products, fabrics, productByCategory]);

    const swatches = swatchesByCategory[activeCategory];
    const activeSwatch = swatches[activeFabricIdx] || swatches[0];

    const handleCategoryChange = useCallback((cat: CategoryFilter) => {
        if (cat === activeCategory) return;
        // Trigger a very fast fade-out → swap → fade-in 
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveCategory(cat);
            setActiveFabricIdx(0);
            setSwatchScrollOffset(0);
            setIsTransitioning(false);
        }, 180); // shortened to 120ms so it feels continuous, no huge gap
    }, [activeCategory]);

    // Constants needed by both hooks and render — must be defined before hooks
    const VISIBLE_ON_RAIL = 5;

    // Reset rail offset when category switches
    useEffect(() => {
        setSwatchScrollOffset(0);
    }, [activeCategory]);

    // Auto-scroll the rail whenever the active swatch index falls outside the visible window
    // Must be BEFORE any early return to prevent Rules-of-Hooks violations
    useEffect(() => {
        if (activeFabricIdx < swatchScrollOffset) {
            setSwatchScrollOffset(activeFabricIdx);
        } else if (activeFabricIdx >= swatchScrollOffset + VISIBLE_ON_RAIL) {
            setSwatchScrollOffset(activeFabricIdx - VISIBLE_ON_RAIL + 1);
        }
    }, [activeFabricIdx, swatchScrollOffset]);

    // ── Early exit — no products or fabrics loaded yet ──
    if (swatches.length === 0 && swatchesByCategory.shirt.length === 0 && swatchesByCategory.pants.length === 0) {
        return null;
    }

    const bgSoft = activeSwatch ? softenHex(activeSwatch.color, 95) : '#FAFAF7';
    const glowColor = activeSwatch?.color || '#D4C5A9';

    const canScrollUp = swatchScrollOffset > 0;
    const canScrollDown = swatchScrollOffset + VISIBLE_ON_RAIL < swatches.length;
    const visibleSwatches = swatches.slice(swatchScrollOffset, swatchScrollOffset + VISIBLE_ON_RAIL);

    const scrollRailUp = () => setSwatchScrollOffset(o => Math.max(0, o - 1));
    const scrollRailDown = () => setSwatchScrollOffset(o => Math.min(swatches.length - VISIBLE_ON_RAIL, o + 1));

    return (
        <section
            className="relative overflow-hidden transition-colors duration-1000 ease-out pt-16 pb-10 lg:py-24"
            style={{ backgroundColor: bgSoft }}
        >
            {/* ── Ambient Glow Background ── */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
                style={{ background: `radial-gradient(ellipse at 40% 50%, ${glowColor}50 0%, transparent 65%)` }}
            />
            {/* Subtle grain texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                backgroundSize: '200px 200px'
            }} />

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:flex relative z-10 max-w-[1800px] mx-auto h-[calc(100vh-80px)] min-h-[700px] max-h-[900px]">

                {/* LEFT: Header text + category pills + bottom info only — no product here */}
                <div className="flex-1 flex flex-col justify-between py-0 pl-12 xl:pl-20 pr-8 h-full relative z-20">
                    <div className="mt-2 shrink-0">
                        <p className="text-sm font-bold text-accent uppercase tracking-[0.25em] mb-3 drop-shadow-sm">
                            Explore Our Fabrics
                        </p>
                        <h2 className="font-display text-5xl xl:text-6xl 2xl:text-7xl font-bold text-primary tracking-tight leading-none drop-shadow-md">
                            Shop by <span className="italic font-medium text-gradient-gold">Fabric</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground max-w-sm text-lg/relaxed font-medium">
                            Tap a swatch to preview your garment in premium textures
                        </p>
                        <div className="inline-flex bg-background/60 p-1.5 rounded-full shadow-sm backdrop-blur-md border border-border mt-8">
                            {(Object.entries(CATEGORY_CONFIG) as [CategoryFilter, typeof CATEGORY_CONFIG['shirt']][]).map(([key, cfg]) => {
                                if (swatchesByCategory[key].length === 0) return null;
                                const isActive = activeCategory === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleCategoryChange(key)}
                                        className={`flex items-center gap-2 px-7 py-2.5 rounded-full font-semibold text-sm transition-all duration-500 ${isActive ? 'bg-primary text-background shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                    >
                                        <cfg.icon className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }} />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Fabric Info — bottom left */}
                    <div className="mt-auto pt-6 pb-2 shrink-0 flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-full border-2 border-border/80 shadow-lg shrink-0 transition-all duration-500"
                            style={{
                                backgroundColor: activeSwatch?.color,
                                backgroundImage: activeSwatch?.textureUrl ? `url(${activeSwatch.textureUrl})` : 'none',
                                backgroundSize: 'cover',
                            }}
                        />
                        <div>
                            <p className="text-[11px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-0.5">Selected Fabric</p>
                            <p className="font-display font-semibold text-2xl text-foreground">{activeSwatch?.name || '—'}</p>
                        </div>
                        {activeSwatch && (
                            <Link
                                to={activeSwatch.productLink}
                                className="ml-4 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-accent text-primary font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group/cta"
                            >
                                Customize Now
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* CENTER: Product image absolutely centered across the ENTIRE section */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {/* Ambient glow blob behind product */}
                    <div
                        className="absolute rounded-full blur-[160px] opacity-50 transition-all duration-1000"
                        style={{
                            backgroundColor: glowColor,
                            width: activeCategory === 'pants' ? '560px' : '460px',
                            height: activeCategory === 'pants' ? '520px' : '480px',
                        }}
                    />
                    {/* Category-aware wrapper: pants are tall so it gets more vertical space */}
                    <div
                        className="relative pointer-events-auto"
                        style={{
                            width: activeCategory === 'pants' ? 'min(44vw, 560px)' : 'min(52vw, 680px)',
                            height: activeCategory === 'pants' ? '70vh' : '76vh',
                            maxHeight: activeCategory === 'pants' ? '650px' : '720px',
                            opacity: isTransitioning ? 0 : 1,
                            transform: isTransitioning ? 'scale(0.97)' : 'scale(1)',
                            transition: `width 500ms ease, height 500ms ease, opacity ${isTransitioning ? '120ms' : '300ms'} ease, transform ${isTransitioning ? '120ms' : '300ms'} ease-out`,
                        }}
                    >
                        {swatches.map((swatch, i) => (
                            <img
                                key={swatch.id}
                                src={swatch.previewImage}
                                alt={swatch.name}
                                className="absolute inset-0 w-full h-full object-contain transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                style={{
                                    opacity: i === activeFabricIdx ? 1 : 0,
                                    transform: i === activeFabricIdx
                                        ? `scale(1.05) translateY(${activeCategory === 'pants' ? '40px' : '0px'})`
                                        : `scale(0.97) translateY(${activeCategory === 'pants' ? '68px' : '28px'})`,
                                    pointerEvents: i === activeFabricIdx ? 'auto' : 'none',
                                    filter: 'drop-shadow(3px 8px 16px rgba(0,0,0,0.12)) drop-shadow(6px 18px 36px rgba(0,0,0,0.08))',
                                }}
                                loading="eager"
                            />
                        ))}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/5 h-4 bg-black/10 blur-2xl rounded-[100%]" />
                    </div>
                </div>

                {/* RIGHT: Vertical Swatch Rail — only this element fades on category switch */}
                <div
                    className="w-[140px] xl:w-[160px] 2xl:w-[180px] flex flex-col items-center justify-center gap-0 py-0 pr-8 xl:pr-12 relative h-full z-20"
                    style={{
                        opacity: isTransitioning ? 0 : 1,
                        transform: isTransitioning ? 'translateX(10px)' : 'translateX(0)',
                        transition: `opacity ${isTransitioning ? '120ms' : '300ms'} ease, transform ${isTransitioning ? '120ms' : '300ms'} ease-out`,
                    }}
                >
                    {canScrollUp && (
                        <button onClick={scrollRailUp} className="mb-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center hover:bg-background hover:scale-110 hover:shadow-md transition-all duration-200 text-muted-foreground hover:text-foreground" aria-label="Scroll swatches up">
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    )}
                    {!canScrollUp && <div className="mb-3 h-9" />}

                    <div className="flex flex-col items-center gap-4" ref={railRef}>
                        {visibleSwatches.map((swatch, visIdx) => {
                            const realIdx = swatchScrollOffset + visIdx;
                            const isActive = realIdx === activeFabricIdx;
                            return (
                                <button key={swatch.id} onClick={() => setActiveFabricIdx(realIdx)} title={swatch.name} className="relative group/swatch outline-none" style={{ transition: 'all 0.5s cubic-bezier(0.25,1,0.5,1)' }}>
                                    <div className={`absolute -left-4 top-1/2 -translate-y-1/2 h-full w-[3px] rounded-full transition-all duration-500 ${isActive ? 'bg-foreground opacity-100' : 'opacity-0'}`} />
                                    <div
                                        className={`rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isActive ? 'w-[88px] h-[88px] xl:w-[100px] xl:h-[100px] ring-[4px] ring-background shadow-xl' : 'w-[64px] h-[64px] xl:w-[72px] xl:h-[72px] opacity-70 hover:opacity-100 hover:scale-[1.05] shadow-sm'}`}
                                        style={{
                                            backgroundColor: swatch.color,
                                            backgroundImage: swatch.textureUrl ? `url(${swatch.textureUrl})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            boxShadow: isActive ? `0 0 0 4px var(--background), 0 16px 32px ${swatch.color}60` : 'inset 0 4px 12px rgba(0,0,0,0.1), inset 0 -6px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <div className={`absolute right-[125%] top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary text-background text-[13px] font-bold px-4 py-2 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] pointer-events-none transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3 group-hover/swatch:opacity-100 group-hover/swatch:translate-x-0'}`}>
                                        {swatch.name}
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-primary" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {canScrollDown && (
                        <button onClick={scrollRailDown} className="mt-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center hover:bg-background hover:scale-110 hover:shadow-md transition-all duration-200 text-muted-foreground hover:text-foreground" aria-label="Scroll swatches down">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    )}
                    {!canScrollDown && <div className="mt-3 h-9" />}

                    {swatches.length > VISIBLE_ON_RAIL && (
                        <div className="mt-6 flex flex-col gap-1.5 items-center">
                            {swatches.map((_, i) => (
                                <div key={i} onClick={() => setActiveFabricIdx(i)} className={`rounded-full cursor-pointer transition-all duration-300 ${i === activeFabricIdx ? 'w-1.5 h-4 bg-foreground' : 'w-1 h-1 bg-muted-foreground/40 hover:bg-muted-foreground'}`} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                MOBILE / TABLET LAYOUT (< lg): Stacked vertical
                Product image center + horizontal swatch track bottom
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="lg:hidden flex flex-col relative z-10 py-0">

                {/* Header */}
                <div className="text-center px-5 flex-shrink-0">
                    <p className="text-xs font-bold text-accent uppercase tracking-[0.25em] mb-3">
                        Explore Our Fabrics
                    </p>
                    <h2 className="font-display text-4xl sm:text-5xl font-semibold text-foreground tracking-tight leading-none">
                        Shop by <span className="italic font-normal text-gradient-gold">Fabric</span>
                    </h2>
                    <p className="mt-3 text-muted-foreground text-base/relaxed max-w-xs mx-auto">
                        Tap a swatch to preview your garment
                    </p>

                    {/* Category Pill */}
                    <div className="inline-flex bg-background/60 p-1 rounded-full shadow-sm backdrop-blur-md border border-border mt-5">
                        {(Object.entries(CATEGORY_CONFIG) as [CategoryFilter, typeof CATEGORY_CONFIG['shirt']][]).map(([key, cfg]) => {
                            if (swatchesByCategory[key].length === 0) return null;
                            const isActive = activeCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleCategoryChange(key)}
                                    className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-500
                                        ${isActive ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                >
                                    <cfg.icon className="w-3.5 h-3.5" />
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Product Image */}
                <div className="relative flex-1 w-full flex items-center justify-center mt-6 pointer-events-none min-h-[50vw] max-h-[65vh]">
                    <div
                        className="absolute w-64 h-64 rounded-full blur-[80px] opacity-40 transition-all duration-1000"
                        style={{ backgroundColor: glowColor }}
                    />
                    <div className="relative w-full max-w-[320px] sm:max-w-[420px] aspect-[3/4] pointer-events-auto">
                        {swatches.map((swatch, i) => (
                            <img
                                key={swatch.id}
                                src={swatch.previewImage}
                                alt={swatch.name}
                                className="absolute inset-0 w-full h-full object-contain filter drop-shadow-xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                style={{
                                    opacity: i === activeFabricIdx ? 1 : 0,
                                    transform: i === activeFabricIdx ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
                                }}
                                loading="eager"
                            />
                        ))}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-4 bg-black/10 blur-xl rounded-[100%]" />
                    </div>
                </div>

                {/* Active Info Plate (Mobile) */}
                <div className="mx-auto mt-4 mb-3 px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-white/50 flex items-center gap-4">
                    <div
                        className="w-8 h-8 rounded-full border border-white/60 shadow shrink-0 transition-all duration-500"
                        style={{
                            backgroundColor: activeSwatch?.color,
                            backgroundImage: activeSwatch?.textureUrl ? `url(${activeSwatch.textureUrl})` : 'none',
                            backgroundSize: 'cover',
                        }}
                    />
                    <div>
                        <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Selected Fabric</p>
                        <p className="font-display font-semibold text-base text-foreground whitespace-nowrap">{activeSwatch?.name || '—'}</p>
                    </div>
                    {activeSwatch && (
                        <Link
                            to={activeSwatch.productLink}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background shadow-lg hover:scale-110 transition-transform"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>

                {/* Horizontal Swatch Track (Mobile — overlapping spheres) */}
                <div className="w-full overflow-x-auto overflow-y-visible px-4 py-6 scrollbar-hide flex justify-center">
                    <div className="flex items-end justify-center gap-0 h-[90px]">
                        {swatches.map((swatch, i) => {
                            const isActive = i === activeFabricIdx;
                            return (
                                <button
                                    key={swatch.id}
                                    onClick={() => setActiveFabricIdx(i)}
                                    className={`
                                        relative rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none cursor-pointer
                                        ${i !== 0 ? '-ml-4 sm:-ml-6' : ''}
                                        ${isActive
                                            ? 'w-[72px] h-[72px] sm:w-20 sm:h-20 -translate-y-5 z-40 ring-[5px] ring-white shadow-2xl'
                                            : 'w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] z-10 shadow-md opacity-70 hover:opacity-100 hover:-translate-y-2 hover:scale-110 hover:z-30'
                                        }
                                    `}
                                    title={swatch.name}
                                >
                                    <div
                                        className="w-full h-full rounded-full"
                                        style={{
                                            backgroundColor: swatch.color,
                                            backgroundImage: swatch.textureUrl ? `url(${swatch.textureUrl})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            boxShadow: isActive
                                                ? `0 0 0 4px white, 0 12px 24px ${swatch.color}70`
                                                : 'inset 0 4px 8px rgba(0,0,0,0.12), inset 0 -4px 10px rgba(0,0,0,0.2)',
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section >
    );
}
