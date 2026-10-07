import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { productService } from '@/services/products';
import { Search, Package, Loader2, SlidersHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useDebounce } from '@/hooks/useDebounce';
import { ProductCard } from '@/components/common/ProductCard';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fabricsData } = useQuery({
    queryKey: ['fabrics'],
    queryFn: () => apiClient.get<any[]>('/fabrics').then(d => d || []),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData ?? [];
  const fabrics = fabricsData ?? [];
  const loading = productsLoading;
  const error = productsError ? 'Failed to load content' : '';

  const categoryOptions = useMemo(() => {
    const products2D = products.filter(p => p.categoryType !== '3d');
    const products3D = products.filter(p => p.categoryType === '3d');
    const productCategories = Array.from(new Set(products2D.map(p => p.category))).filter(Boolean);

    const formatLabel = (c: string) => {
      if (c === 'shirt') return 'Shirts';
      if (c === 'pants') return 'Pants';
      return c.charAt(0).toUpperCase() + c.slice(1) + 's';
    };

    const dynamicOptions = productCategories.map(c => ({
      id: c === 'shirt' ? 'dress-shirts' : (c === 'pants' ? 'dress-pants' : c),
      label: formatLabel(c),
      dbCategory: c
    }));

    const options = [{ id: 'all', label: 'All', dbCategory: 'all' }];
    const seen = new Set(['all']);
    dynamicOptions.forEach(opt => {
      if (!seen.has(opt.id)) {
        options.push(opt);
        seen.add(opt.id);
      }
    });

    if (products3D.length > 0) {
      options.push({ id: '3d-models', label: '3D Models', dbCategory: '3d-models' });
    }

    return options;
  }, [products]);

  // Map URL param IDs back to DB categories
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {
      'dress-shirts': 'shirt',
      'dress-pants': 'pants',
      '3d-models': '3d-models'
    };
    // Add dynamic mappings
    products.forEach(p => {
      if (p.category && p.category !== 'shirt' && p.category !== 'pants') {
        map[p.category] = p.category;
      }
    });
    return map;
  }, [products]);

  useEffect(() => {
    const param = searchParams.get('category') || 'all';
    // Allow any param if it matches an ID or if it's a direct DB category match?
    // Stick to strict matching against options for UI consistency
    const valid = categoryOptions.some((c) => c.id === param);
    const newCategory = valid ? param : 'all';
    // Only update if value actually changed to prevent re-render jerk
    if (newCategory !== selectedCategory) {
      setSelectedCategory(newCategory);
    }
  }, [searchParams, categoryOptions, selectedCategory]);

  const filteredItems = useMemo(() => {
    const normalized = debouncedSearchTerm.trim().toLowerCase();

    const matchingProducts = products.filter((product) => {
      if (selectedCategory !== 'all') {
        const mapped = categoryMap[selectedCategory] || selectedCategory;
        if (mapped === '3d-models') {
          if ((product as any).categoryType !== '3d') return false;
        } else if (product.category !== mapped) {
          return false;
        }
      }
      return !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized);
    });

    return matchingProducts.map(p => ({
      ...p,
      categoryType: (p as any).categoryType || '2d',
      is3D: (p as any).categoryType === '3d',
      path: (p as any).categoryType === '3d' ? '/3d-customizer' : undefined,
      images: {
        ...p.images,
        baseImage: p.images?.baseImage || p.images?.fabricPreviewThumbnails?.[0],
        galleryByFabric: p.images?.galleryByFabric // Explicitly pass for clarity
      },
      customizationOptions: p.customizationOptions
    }));
  }, [products, debouncedSearchTerm, selectedCategory, categoryMap]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: categoryId });
    }
  };

  return (
    <SiteLayout>
      <div className="bg-white min-h-[calc(100vh)] flex flex-col -mt-20 pt-20">
        <div className="container mx-auto px-4 lg:px-8 pt-8 pb-20 flex-1">
          {/* Header */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
              <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
                Browse Products
              </h1>
              <p className="text-muted-foreground max-w-xl text-right">
                Explore our curated selection of customizable garments. Each piece can be tailored to your exact specifications.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-12 animate-fade-up stagger-1">
            <div className="flex flex-col lg:flex-row gap-4 p-4 bg-white rounded-2xl border border-border/50 shadow-soft">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-muted/30 border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
                <SlidersHorizontal className="w-5 h-5 text-muted-foreground shrink-0 mr-1" />
                {categoryOptions.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${selectedCategory === category.id
                      ? 'bg-primary text-white shadow-soft'
                      : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            // Skeleton cards that match the product grid layout
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-3xl overflow-hidden bg-muted/30 border border-border/50 animate-pulse">
                  <div className="aspect-[4/5] bg-muted/50" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted/50 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-32 animate-fade-up">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                <span className="text-3xl">😕</span>
              </div>
              <h3 className="font-display text-xl font-medium text-foreground mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-32 animate-fade-up">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-medium text-foreground mb-2">No items found</h3>
              <p className="text-muted-foreground mb-6">
                {selectedCategory !== 'all'
                  ? 'This category is empty. Try exploring other categories.'
                  : 'Try adjusting your search or filters.'}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleCategoryChange('all');
                }}
                className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredItems.map((item: any, index: number) => (
                <ProductCard key={item._id} item={item} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
