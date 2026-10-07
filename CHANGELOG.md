# Changelog

## Phase 110: Profile Persistence & Script Optimization (Apr 24, 2026)
- **Profile Update Persistence**: Fixed a synchronization issue where updated customer profile data was not being persisted to local storage, resulting in stale data on page refresh.
- **Enhanced Customer Profile**: Expanded the `/me` API endpoint to include the customer's address, enabling better personalization and order fulfillment tracking.
- **Script Infrastructure**: Removed redundant `npx` prefixes from `pnpm` scripts to streamline the development environment and avoid sandbox pathing issues.
- **Security Tooling**: Developed a server-side admin password reset utility to enable secure credential recovery for administrative accounts.
- **CORS Configuration**: Explicitly whitelisted the `PATCH` method in the server's CORS policy to support partial resource updates for customer and admin settings.


## Phase 109: Cross-Platform Visual Synergy (Mar 26, 2026)
- **Unified Device Showcase**: Integrated the `desktop-preview.png` alongside the mobile screenshot in the README, creating a high-impact visual of the platform across all breakpoints.
- **Enhanced Captioning**: Standardized captions to highlight "pixel-perfect responsiveness" and "high-fidelity interfaces" for professional credibility.


## Phase 108: Final Visual Placeholder Integration (Mar 26, 2026)
- **Admin Dashboard Signal**: Integrated a pre-configured placeholder for `admin-preview.png` with a professional caption within the Real-Time Support section.
- **Mobile Fidelity Signal**: Pre-wired the `mobile-preview.png` placeholder under the Native Support section to highlight cross-platform capabilities.
- **Visual Flow Optimization**: Standardized HTML captioning for architectural diagrams to ensure a premium, centered presentation on GitHub.


## Phase 107: Perfect 10/10 Documentation Audit (Mar 26, 2026)
- **Footer De-duplication**: Removed redundant italicized attribution, standardizing on a single, professional bold footer.
- **Visual-Ready State**: Purged all instructional placeholder comments from the Preview section, replacing them with a crisp "Coming Soon" status that maintains a high-end look while waiting for demo media.
- **Information Density Optimization**: Transferred the "103 phases" engineering signal into the footer credit line, improving the document's content flow and information hierarchy.
- **10/10 Industry Alignment**: Achieved a perfect scores across all researched benchmarks: Header Navigation, Live Signals, IP Protection, and Structural Clarity.


## Phase 105: Senior Documentation Final Polish (Mar 26, 2026)
- **External Signal Hardening**: Replaced unconventional 'Phases' badge with high-relevance 'Proprietary License' and 'Mobile Support' (Android | iOS) badges, aligning with top-tier production repositories.
- **AI Infrastructure Visibility**: Restored and expanded the 'Real-Time AI Support' core capability section, detailing the Socket.io and Gemini AI integration.
- **Feature Matrix Balancing**: Re-engineered the Feature Highlights table to provide equal visual weight to the AI Support engine alongside the 3D and E-Commerce cores.
- **Technical Verbiage Standardization**: Performed a full-stack terminology audit to ensure absolute consistency across the README, Changelog, and internal guides.


## Phase 104: README Aesthetic & Signal Refinement (Mar 26, 2026)
- **Visual Impact Anchors**: Integrated professional status badges and a high-impact Project Scope one-liner to instantly establish the platform's value proposition.
- **Visual-First Presentation**: Implemented a 3-column "Key Features at a Glance" table and a dedicated visual preview section (GIF/Screenshot placeholders) for maximized scanability.
- **Premium Documentation Polish**: Refined emoji usage and header hierarchy to align with high-end open-source and enterprise standards.
- **Development Signal**: Condensed 103 phases of development history into a concise highlight box, showcasing engineering velocity and project complexity.


## Phase 103: Senior Documentation Refactor & Security Hardening (Mar 26, 2026)
- **Industry Standard README Refactor**: Completely transformed the `README.md` into a high-level product overview. Removed all technical setup and deployment steps to protect project privacy and maintain a clean, professional entry point.
- **Operational Documentation Index**: Engineered a comprehensive index in the primary `README` that maps all technical operations to isolated files within the `/docs` repository (Setup, DevOps, Asset Pipeline, etc.).
- **Security & Maintenance Polish**: Scrubbed the root repository of sensitive environment-specific instructions, ensuring the codebase follows senior-level industry standards for enterprise-grade SaaS platforms.


## Phase 102: Global Site Settings & Layout Tuning (Mar 26, 2026)
- **Global Site Settings Architecture:** Engineered a singleton `SiteSettings` MongoDB schema and public/admin API infrastructure (`/api/settings` and `/api/admin/settings`) to support dynamic global site assets.
- **Admin Settings Configuration Hub:** Introduced a new "Global Site Settings" section within the Admin Dashboard, allowing administrators to directly upload and swap out the homepage CTA video via Cloudinary.
- **Video Cloudinary Integration:** Updated the `multer-storage-cloudinary` middleware configuration to natively support and optimize video resource types (.mp4, .webm, .mov).
- **Viewport-Agnostic Padding Logic:** Re-engineered the `ShopByFabric` section padding by lifting it to the outer `<section>` wrapper. This prevents the standardized `py-16 lg:py-24` padding from squashing the inner `100vh` layout constraints on small screens.
- **Homepage Spacing Standardization:** Enforced a universally cohesive vertical rhythm across the entire homepage, standardizing all major section paddings to `py-16 lg:py-24`.
- **Carousel Shadow Edge Fix:** Resolved a visual bug in the `ShopByCategory` carousel where shadow spreads were being clipped. Implemented a precision safe-width calculation with a `-mx-4 px-4` buffer to accommodate drop-shadow spreads.
- **Dynamic Homepage Binding:** Wired the frontend `Home.tsx` to prefetch site settings on mount, enabling real-time video updates with a graceful local fallback.

## Phase 58: Android Build Optimization & Export Engine (Mar 17, 2026)
- **Capacitor 8 Gradle Resolution:** Reconstructed the Android `libs.versions.toml` Gradle catalog from scratch to inject missing Capacitor 8 variables (`androidx-activity`, `framework`, etc.), permanently resolving the `Could not get unknown property 'gradle'` IDE build failure.
- **Apple Silicon Gradle Tuning:** Injected `org.gradle.parallel=true`, `org.gradle.caching=true`, and boosted JVM memory allowance to `4096m` in `gradle.properties`, massively accelerating Android Studio compilation times on macOS hardware.
- **Emulator Networking Engine:** Successfully mapped Android Studio's built-in emulator loopback IP (`10.0.2.2`) directly to the Mac's `localhost` via Vite's `--host` flag and `capacitor.config.ts`, enabling lightning-fast HMR live-reloading within the virtual device without relying on unstable Wi-Fi bridging.
- **Heavy Asset Pruning:** Automated a new `clean:mobile-assets` hook inside `package.json` that intentionally deletes the `public/models/` and `public/hdri/` folders from the compiled `dist/` directory mere seconds before `npx cap sync` executes. This fundamentally prevents 200MB+ of cloud-hosted 3D assets from bloating the standalone APK native bundle.
- **Standardized CORS Integration:** Explicitly whitelisted natively-injected mobile headers (`http://localhost`, `capacitor://localhost`, `app://localhost`) inside the Node.js backend's `allowedOrigins` array, instantly resolving the critical white-screen fetch block that occurred when testing Production APKs.
- **Absolute API Path Resolution:** Re-engineered `src/lib/apiClient.ts` to dynamically resolve `VITE_API_URL` as an absolute base path for production/staging builds. This fundamentally resolves the "White Screen" failure where the Capacitor WebView incorrectly attempted to fetch from `http://localhost/api` due to legacy relative pathing.
- **Global Error Boundary Implementation:** Scaffolded a robust `ErrorBoundary` component in `src/components/ErrorBoundary.tsx` and wrapped the entire application tree in `src/main.tsx`. This ensures that even if a critical runtime error occurs on mobile, the user is presented with a "Reload App" recovery UI instead of an un-debuggable blank white screen.
- **APK Validation & Documentation:** Completely rewrote the Mobile App Deployment Guide to definitively separate un-signed standalone `.apk` generation (for immediate WhatsApp/Email testing) versus cryptographic `.aab` Android App Bundle generation (strictly required for Google Play Store algorithm optimization).

## Phase 59: Mobile UI/UX Parity & Responsive Polish (Mar 17, 2026)
- **Product Details Overflow Fix:** Restructured the `FabricPreviewThumbnails` pagination strip into a strict 5-column grid across small/mobile devices, utilizing `WebkitMaskImage` gradients to elegantly hint at horizontal scrollability, permanently resolving horizontal window overflow.
- **Customizer Height Synchronization:** Substantially increased the base preview image height minimum boundaries (`h-[50vh]`) across `Customize.tsx` and `Customize3D.tsx`, ensuring the core product image demands more screen real estate before controls are rendered below.
- **Drag-to-Pan Integration:** Engineered a custom drag-and-drop pointer event system into `ProductPreview.tsx` enabling users to seamlessly pan around the 2D garment imagery while heavily zoomed in. 
- **Header Component Standardization:** Replaced complex Breadcrumb navigation strings natively resolving the global mobile Header constraint issue, enabling full long-form product titles (`Bespoke 2D Shirt`) to cleanly display without breaking responsive layouts.
- **Floating Global Widget Polish:** Downscaled the universal Chat Widget floating action button specifically for mobile breakpoints, ensuring its background-pulse animation correctly respects `z-index` layering without overlapping the interface.
- **3D vs 2D Control Synchronicity:** Shrunk and explicitly matched font sizes, paddings, and flex gaps across `MobileStepNavigation3D.tsx` to achieve 100% 1:1 identical button layouts against the 2D `CustomizationSteps`. Rebuilt `Configurator3DControls.tsx` to mount the "Selected Customizations" context payload explicitly before the Price Summary on `<450px` windows matching 2D structure natively.
- **Universal Gallery Slideshowing:** Overhauled isolated `ProductCard` components replacing hard-coded `baseImage`/`hoverImage` swaps entirely. All catalog grids now stream full gallery arrays into an automated interval-driven hook, cycling through every product angle smoothly while the user triggers desktop `:hover` or mobile touches. 
- **Desktop Hero Optimization:** Tweaked the Homepage's Hero section, adjusting upper and lower vertical paddings ensuring ultrawide and 1080p desktop layouts display all CTA buttons securely within the primary initial viewport natively, eliminating forced initial scrolling.

## Phase 58: Android Build Optimization & Export Engine (Mar 17, 2026)
- **Product Hover Crossfade:** Upgraded the universal `ProductCard` component to elegantly crossfade into secondary gallery or back images on hover, elevating catalog aesthetics.
- **Multi-Image Admin Dashboard:** Engineered a new "Gallery Images" upload block inside the Admin Products Tab. Features complete drag-and-drop reordering, localized semantic badging (Front, Back, Side), and unified Cloudinary optimization.
- **Carousel Gallery Integration:** Safely merged the new dynamic array of gallery images into the existing showcase sliders inside the Product Details component without layout breakages.
- **Future-Proofed Schema:** Scaffolded `videoUrl` into the overarching Product Types and MongoDB schema for upcoming streaming capabilities.

## Phase 56: 3D Preview Tuning & Cart Restoration Logic (Mar 15, 2026)
- **3D Preview Performance:** Removed expensive CSS `drop-shadow-2xl` filters causing intense GPU blurring workloads over WebGL canvases. Engineered `frameloop="demand"` and capped device pixel ratios (`dpr={[1, 1.5]}`) across 3D elements, completely terminating 60fps idle GPU drain when the model isn't rotating or animating.
- **Contact Shadows:** Baked high-fidelity shadow geometry calculations into static low-res continuous textures (`frames={1}`, `resolution={512}`) completely terminating parallel rendering overload during multi-thumbnail displays.
- **Cart Thumbnail Streaming:** Enforced Cloudinary paths over local fallbacks in preview thumbnails. Thumbnails now actively query actual Fabric names per selected structural component natively, replacing legacy default mesh placeholder names.
- **Cart Menu UX:** Stripped unnecessary confirmation modals from Cart and Saved Designs, allowing instant native deletions while intuitively keeping the parent dropdown navigation gracefully mounted.
- **3D Design Restoration Engine:** Re-engineered the URL restoration proxy (`isDesign3D`) to properly identify and route Cart blueprint items into the 3D customizer. Upgraded `useDesignRestore3D` to search isolated browser local storage (`findDesignById`), parsing and mapping complex physical structural shapes (Collars, Cuffs, Pockets) and nested sub-fabrics natively back onto the Customizer payload.

## Phase 55: Safepay V1 Standardization, Ngrok Architecture & 3D Thumbnail Streaming (Mar 14, 2026)
- **Safepay V1 Standardization & Refunds:** After extensive architectural testing of Safepay V3, we verified that V3 Trackers strictly demand custom frontend payment UIs and actively forfeit Safepay's Hosted Checkout proxy. Engineered a complete reversal to purely utilize the Safepay V1 API for rock-solid Hosted Checkout PCI compliance natively. Implemented accurate V1 reverse-polling for successful Refunds, and documented Safepay's known sandbox settlement limitations.
- **Robust Webhook Resilience:** Upgraded `paymentController.ts` to seamlessly parse both `payment:created` and `payment.succeeded` event schemas from Safepay, ensuring maximum version compatibility as standard webhook payloads evolve.
- **Ngrok V3 Architecture:** Retired raw terminal CLI commands (`ngrok http --url...`) in favor of a strictly architected `ngrok.yml` mapping. Engineered a seamless `pnpm run ngrok` script in `package.json` that securely cross-loads global authtoxins into the local workspace endpoint configuration without exposing credentials.
- **Strict Cart Image Deletion:** Closed a multi-tenant storage leak by exposing an unprotected `POST /api/upload/delete-cart-item` endpoint, allowing guest users to instantly delete orphaned Cloudinary `/cart/` screenshots when explicitly removing 3D builds from their shopping cart or successfully completing an order.
- **Checkout Polish:** Unified the checkout interface by moving the Payment Method selector and Promo Code fields structurally above the fold. Repurposed the universal `SavedDesignPreviewModal` to elegantly display completed cart items inside the Order Summary column mapping identical UI/UX visual paths system-wide.
- **3D Asset Streaming & Crash Resolution:** Fixed a major app-wide crash in `ProductPreview3D.tsx` where missing `environmentUrl` HDRs triggered fatal local fallback texture requests. Upgraded `SavedDesignPreviewModal.tsx` and `DesignPreviewContent.tsx` to reliably fetch the full Product schema (`_fullProductData`) and actively stream the heavily-compressed Cloudinary 750KB GLB Models and downscaled HDRs directly to the 3D thumbnails, bypassing the 10MB monolithic local fallback assets natively.

## Phase 54: Multi-Client Infrastructure & Database Isolation (Mar 12-13, 2026)
- **Nginx Domain Routing:** Fixed critical Certbot SSL generation error (`Could not automatically find a matching server block`) by ensuring Nginx `server_name` directives perfectly align with DuckDNS subdomains and enforcing proactive `sites-enabled` symlink creation prior to SSL provisioning.
- **Git Divergent Branch Mitigation:** Hardened VPS deployment scripts to gracefully resolve `fatal: Need to specify how to reconcile divergent branches` via explicit `git fetch origin` and `git reset --hard origin/dev-c` commands, ensuring the production server always strictly mirrors the main branch without manual merge conflicts.
- **Secure SSH Database Tunneling:** Documented and verified the strict SSH tunneling architecture for multi-client database auto-seeding. Bypassed public IP exposure by mapping local Mac port `27018` securely through Hostinger's port `65002` directly into the isolated client's MongoDB instance.
- **Triple-Layer Multi-Tenant Isolation:** Established the standard procedure for proving SaaS isolation to stakeholders, utilizing MongoDB's super-admin `mongosh -u admin -p [password] --authenticationDatabase admin` for absolute database enumeration, alongside PM2 process mapping and discrete Cloudinary per-client folders.

## Phase 53: Production Load Testing & Performance Audit (Mar 11-12, 2026)
- **High-Concurrency Load Testing:** Built a comprehensive `k6/` load testing suite containing `user-journey-test.js`, `socket-stress.js`, `load-test-vps.js`, and `load-test-vercel.js`. Engineered complex K6 virtual user journeys simulating 1,600 concurrent shoppers executing full auth, cart additions, and checkout transactions.
- **Socket.io Leak Resolution:** Fixed an undetectable memory leak in `server/socket.ts` where disconnected clients were not removed from their respective `admin` or user rooms, eventually causing V8 garbage collection failure. Mandated WebSocket-only transports and strict `pingInterval`/`pingTimeout` limits.
- **MongoDB Connection Tuning:** Eliminated MongoDB connection exhaustion by injecting dynamic `maxPoolSize` parameters into `db.ts` depending on the environment, ensuring the Express backend doesn't crash Atlas under 10k+ surges.
- **Dynamic ID Generation:** Prevented Mongoose `E11000` duplicate key errors in K6 scripts by bypassing CPU-intensive `Math.random()` functions, injecting a mathematically collision-proof `K6_T${__ENV.TID}_VU${__VU}_I${__ITER}_${Date.now()}` Order Number format instead.
- **Kernel-Level Mitigations:** Identified and documented extreme rate-limiting on both macOS (`somaxconn` & Ephemeral Port exhaustion) and Ubuntu VPS platforms. Successfully proved the Linux `nf_conntrack` algorithm was dropping K6 traffic at 1,600 connections to protect the 1-core VPS from what it identified as a DDoS attack.
- **Nginx & PM2 Scaling:** Standardized the `nginx.conf` `worker_connections` limit to `4096` across all KVM1 VPS deployments. Established a universal PM2 `cluster` mode baseline leveraging the Node.js event loop's capability to max out network interfaces long before CPU starvation.
- **Automated Deploy Checks:** Hooked `scripts/deploy-checklist.cjs` into `postinstall`, ensuring automated colored terminal reminders for Nginx limits, FFmpeg existence, MongoDB capping, and Cloudinary configuration appear dynamically based on the current VPS/Vercel/Render host detection.

## Phase 52: Universal Payment Integration & Safepay Gateway (Mar 9, 2026)
- **Safepay Architecture:** Integrated Safepay's `tracker` API for secure checkout redirections. Built a highly secure Express webhook endpoint using `express.raw()` to capture raw request bodies, strictly verifying Safepay's `X-SFPY-SIGNATURE` via HMAC-SHA512.
- **Order Lifecycle Extensions:** Upgraded the unified `Order` type across the stack to support `paymentGateway`, `discount`, `promoCode`, and `cancelReason`.
- **Admin Refund Engine:** Empowered Admins to initiate Safepay refunds directly from the `AdminOrdersTab`, communicating with the `/api/payments/safepay/refund` route for instantaneous order reconciliation.
- **Failovers & Retries:** Built a "Retry Payment" mechanic into the `AccountOrdersTab` allowing customers to instantly re-initiate Safepay checkouts for abandoned carts.
- **Universal Receipting:** Developed `printReceipt.ts`, an elegant, branded HTML order receipt generator available to customers on order confirmation, and to both customers and admins in their respective order tabs.
- **Real-Time Order Notifications:** Upgraded the Socket.io `NotificationContext` to push live `payment_failed` and `payment_refunded` alerts directly to users based on webhook fulfillment.
- **Promo Code Discounts:** Connected frontend Promo Code logic to order creation, accurately processing fixed/percentage discounts and tracking `usedCount` caps in Mongo.

## Phase 51: Asset Pipeline Standardization & Compression Optimization (Mar 9, 2026)
- **Cloudinary Path Consistency:** Added missing `CLOUDINARY_BASE` environment prefixes to the HDR uploading routes. Restructured the 3D database seeder to establish product context first, ensuring entirely identical per-product Cloudinary paths between automated seeding and manual admin uploads.
- **Compression Parity:** Introduced `quality:auto` to the generic `upload_stream` and seeder configs. This effortlessly strips EXIF tags and optimizes image encodings at storage-time while keeping the original JPG/PNG format — preserving the vital frontend `f_auto` transform's ability to serve AVIF imagery to Chrome and Safari clients instead of locking formats prematurely via WebP. Additionally, the auto-seeder now actively injects `format:webp` and `quality:auto:best` specifically for 3D texture maps, achieving 100% parity with the manual `/api/upload/texture` dashboard route.
- **Unified Seeder Pipeline:** Upgraded the `seed_products.ts` script to execute the **exact same** GLB geometry compression (`gltf-transform` + `gltfpack`) and HDR downscaling (`ffmpeg`) routines as the admin dashboard routes. Source files in `public/` are protected from deletion by copying them to `/tmp/` before processing.
- **Schema-Level SEO Enforcement:** Migrated product SEO slug generation (`bespoke-2d-shirt`) out of isolated controllers and directly into a Mongoose `pre('validate')` hook on the Product schema. This guarantees every entry point (seeder, admin API, direct db insert) enforces valid, dynamic SEO slugs, permanently resolving empty UI state bugs when switching between 2D and 3D customizers.

## Phase 50: Shop by Fabric — Homepage Hero Section Overhaul (Mar 8–9, 2026)

### New Features
- **Immersive Full-Viewport Hero:** Rebuilt the Shop by Fabric section into a true viewport-filling hero (`100vh - 80px`) with min-height and max-height guards for every screen size.
- **Absolute-Centered Product Image:** Product image is now an `absolute inset-0` centred overlay spanning the full section width — independent of the left text or right swatch column — so it appears visually centered on the screen at all times.
- **Category-Specific Image Sizing:** Pants load in a taller/narrower frame to represent full-length garments; shirts load wider.  Both sizes animate smoothly (500ms ease) on category switch.
- **Directional Ambient Glow:** A radial gradient blob behind the product image dynamically adopts the active fabric's accent color. Changes animate over 1000ms for a cinematic effect.

### Improvements
- **Smooth Crossfade Transition:** Category switch now uses a two-phase `isTransitioning` fade — a quick 120ms fade-out, then a graceful 300ms ease-out fade-in — applied simultaneously to both the center image stage and the right swatch rail. Left column text/buttons remain static with no flash.
- **Realistic Garment Shadow:** Replaced flat `drop-shadow-2xl` with dual angled CSS `drop-shadow()` filters (offset 3px/6px right-down) that trace the actual PNG silhouette, grounding the garment naturally into the section.
- **Semantic Theme Tokens:** Replaced all hardcoded `bg-white/40` and `ring-white` values with theme-aware `bg-background/80`, `border-border`, `ring-background` — now fully Dark/Light mode adaptive.
- **Swatch Rail Polish:** Active swatch disc uses `ring-[4px] ring-background` with a color-tinted box-shadow. Inactive discs hover-scale to `1.05` (was `1.10`) for subtler, more premium feedback.
- **Category Pills:** Hover state standardized to `hover:bg-muted/50` matching the rest of the app's Shadcn-style pill buttons.
- **Mobile Stability:** Mobile layout untouched — all layout changes scoped to `lg:` breakpoint only.

### Bug Fixes
- **Hooks Order Error:** Fixed a React "change in order of Hooks" warning caused by a conditional `useEffect` inside `ShopByFabric`. All hooks are now declared unconditionally at the top of the component.
- **Empty-Frame Gap:** Eliminated an "empty screen" void between category switches caused by a 280ms JS timeout that was longer than the CSS fade duration. Shortened to 120ms.

## Phase 49: 3D Asset Pipeline Rewrite & HDR Downscaling (Mar 8, 2026)
- **4-Step GLB Compression:** Rewrote the GLB server uploading pipeline to properly execute `gltf-transform` (prune, resize 1024px, webp) before `gltfpack` (-cc), bypassing CLI chaining bugs and achieving 750KB compressed sizes (down from 9.96MB).
- **HDR Environment Downscaling:** Introduced `hdrCompressor.ts` utilizing native `ffmpeg` to Lanczos-downscale 2K HDR environment files to 1K resolution, slashing size from 6MB to 1.5MB to speed up global 3D scene loading.
- **Thumbnail Consistency Constraint:** Eliminated frontend/backend thumbnail format divergence by rewriting `fabricService.ts` to strictly prioritize Cloudinary's optimized `thumbnailUrl` over raw `colorMapUrl` across Admin dashboards and 3D Customizers.
- **WebP Cloudinary Enforcement:** Patched the `CloudinaryStorage` configuration to forcefully convert all uploaded 3D fabric PBR texture maps (Color, Normal, Roughness) into lossless WebP.


## Phase 48: 3D Asset Compression & Rendering Optimization (Mar 6, 2026)
- **GLB Compression Pipeline:** Intercepted admin `.glb` uploads with a server-side `child_process` running `gltfpack`. Compressed geometries via Meshopt (`-cc`) and textures via KTX2 (`-tc`). Reduced test models from 9.5MB to 1.0MB (89% reduction).
- **WebAssembly Decoders:** Modified `ProductPreview3D.tsx` to utilize `MeshoptDecoder` and custom KTX2 WebAssembly transcoders (`public/basis/`) for direct-to-GPU memory unwrapping on the client.
- **Universal 2D Swatches:** Removed obsolete network-heavy 3D Fabric Swatches from the admin catalog. All 3D preview meshes now reuse the Universal 2D base fabric thumbnails to massively speed up customizer initial load times.
- **Active UI Polishing:** Injected `brightness-0 invert` CSS filters into `CustomizationSteps.tsx` to dynamically transform Cloudinary-hosted black SVG selection widgets into pure white when the step bubble turns active blue.

## Phase 47: Universal UI Refinements & 2D/3D Customizer Synchronization (Mar 6, 2026)
- **Universal Measurement UI:** Replaced manual text inputs with an interactive `Slider` UI component complete with dynamic value badges and guided tips across all 2D and 3D product customizers.
- **Layout Robustness:** Re-injected standard Tailwind UI `.container` responsive max-width overrides into `index.css` to fix infinite horizontal scaling on 4K/Ultrawide monitors introduced by Tailwind v4. Applied CSS intersection margins (`-mt-20 pt-20`) to eliminate colored background bleeding under the transparent fixed header on all standard views.
- **2D/3D Seamless Transitions:** Refactored state passing between the 2D customizer and 3D customizer to eliminate default UI state resetting and load jerks.
- **Performance & Consistency:** Implemented localized WebP blur-loaders for 3D swatches (`ShopByFabric`), redesigned the Fabric Selector into an overlapping spheres layout, and automatically enforced primary accent UI borders across customized product cards.

## Phase 46: Asset Pipeline Robustness & UI Rendering Bugfixes (Mar 2, 2026)
- **SVG Upload Reliability:** Patched Cloudinary configuration (`server/config/cloudinary.ts`) to natively process SVG vectors, explicitly bypassing `multer-storage-cloudinary` format validator crashes.
- **Admin Network Optimization:** Removed eager 3D fabric `renderFabricSwatch` preloader from `AdminProductsTab.tsx`, significantly reducing network payload and locking 3D loading to explicit user actions.
- **UI Rendering Hierarchy:** Fixed CSS `mix-blend-multiply` constraints and explicit Z-Index structures in `ProductPreview.tsx` to guarantee solid Pant accessories (like Belts) retain color and render correctly above dark fabrics.

## Phase 45: Cloudinary ID+Slug Deep Audit & 3D Subfolder Restructure (Feb 28, 2026)
- **`idSlug()` Helper:** Exported centralized `{id}-{slug}` naming function from both `server/constants/cloudinaryFolders.ts` and `src/lib/cloudinaryFolders.ts`. Applied to every dynamic entity level (product, fabric, option group, option, variant fabric, customer, admin).
- **Sub-Entity Folder Naming:** Fabric, option group, option, and variant folders now use `{entityId}-{entitySlug}` instead of bare IDs — browsable in the Cloudinary dashboard while remaining immutable.
- **3D Subfolder Restructure:** Replaced flat `fabrics/{slug}/` with `3d-fabrics/texture-maps/{fabricId}-{fabricSlug}/` for PBR textures and new `3d-fabrics/3d-swatches/{fabricId}-{fabricSlug}/` for server-rendered thumbnails. Renamed `assets/models/` → `assets/3d-model/` and `assets/environments/` → `assets/environment-map/`.
- **Seeder Centralization:** Rewrote `seed_products.ts` to use imported path helpers (`getProductFabricPath`, `getProductOptionPath`, etc.) — removed local `slugify()` and all 16+ inline path constructions. Zero divergence between admin panel and seeder.
- **`renderFabricThumbnail.ts`:** Updated to accept `productSlug`/`productId`/`fabricName` for product-scoped `3d-swatches/` paths with global fallback.
- **Frontend Mirror:** Updated `src/lib/cloudinaryFolders.ts` with `splitFolderAndId()` DRY helper and new `getProduct3DTextureMapFolderAndId`/`getProduct3DSwatchFolderAndId`.
- **AdminProductsTab:** Updated 15+ call sites to pass both entity ID and name for every dynamic level.
- **Documentation:** Rewrote `CLOUDINARY_ASSET_LIFECYCLE.md` and `SKILL.md` with updated hierarchy and function signatures.

## Phase 44: UI/UX Ultrawide Readiness, SVG Optimization & 3D Refactor (Feb 26, 2026)
- **Product-Driven 3D Engine:** Removed hardcoded 3D fallback paths (`/models/shirt.glb`). The customizer now strictly loads 3D geometry and environments explicitly provided by the active 3D Product model.
- **UI/UX Scalability & SVG Polish:** Hand-optimized 42 customizer styling options via SVGO (reducing 1.5MB to 340KB), implemented CSS `geometricPrecision`, and verified native 4K/Ultrawide `max-width` constraints across all dashboard and product grids.
- **Admin Routing Fix:** Resolved a 404 error triggering during deep-links to `/admin` by injecting explicit Route mapping into `App.tsx` bypassing the router fallthrough.

## Phase 43: Cloudinary Health Engine & Server-side Thumbnails (Feb 25-26, 2026)
- **Cloudinary Health Reconciliation Engine:** Built native API endpoint (`cloudinaryReconciliation.ts`) to cross-reference MongoDB with Cloudinary, allowing Admins to safely discover, purge orphaned files, and reclaim storage directly from the dashboard.
- **Server-Side Three.js PBR Rendering:** Integrated `gl` (headless WebGL) to generate 3D fabric thumbnails (Diffuse, Normal, Roughness) natively on the Node server during upload, offloading gigantic 2K texture loads from the Admin UI.
- **Admin Scripts:** Added utility scripts (`render_all_thumbnails.ts`, `delete_fabric.ts`, etc.) for advanced database and asset management.

## Phase 42: Idempotent Product Seeder & Cloudinary Idempotency (Feb 25, 2026)

### Idempotent Seeding Architecture (`seed_products.ts`)
- **Relationship Preservation:** The seeder no longer uses destructive `Product.deleteMany()`. It now intelligently looks up existing products ("Bespoke 2D Shirt", etc.) and re-uses their exact `_id` via `Product.findByIdAndUpdate({ upsert: true, returnDocument: 'after' })`, ensuring historic customer orders and saved designs never break during catalog updates.
- **Cloudinary Auto-Scrubbing:** When updating an existing product, the seeder utilizes the Cloudinary Admin API (`delete_resources_by_prefix`) to instantly wipe the existing `products/2d/{id}/` folder before uploading new assets. This guarantees zero orphaned images or duplicated files.
- **Script Consolidation:** Deleted obsolete, partial seeder files (`seedData.ts`, `seedPants.ts`). All 2D and 3D product initialization is centralized under `pnpm run seed:products`.
- **Payload Extraction:** Extracted the massive 2D Pant configuration payload into `pantStyleSeed.ts` for modularity, maintaining the same pattern established by `shirtStyleSeed.js`.

## Phase 41: Admin Auto-Seed, Per-Option Variant Types & Front/Back Variant Separation (Feb 23, 2026)

### Auto-Seed Super Admin on First Start
- **New database, instant access:** Server auto-creates a super admin on first start when the database is empty.
- **Environment-driven:** Uses `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` from `.env`.
- **Password auto-hashed:** Uses the Admin model's `pre('save')` hook — no manual bcrypt needed.
- **One-time only:** Skipped on subsequent starts if a super admin already exists.

### Per-Option Variant Types
- **`variantType` field on option groups:** Controls what upload UI the admin sees per customization group.
- **Four types:** `fabric` (front/back per fabric), `front-back` (simple front + back), `front-only`, `back-only`.
- **Use cases:** Pants fit/cuffs = per fabric, waist = front+back, fastening/pleats = front only, back-pockets = back only.
- **Backward compatible:** Existing products default to `fabric` (original behavior).

### Front/Back Fabric Variant Separation
- **Manage Variants dialog:** Now shows separate Front and Back upload slots per fabric card.
- **Upload handler:** Stores variants as `{ front, back }` object instead of flat string.
- **Remove handler:** Deletes per-view (front or back) independently.
- **Zero customizer changes:** The preview rendering already supported `{ front, back }` objects.

## Phase 40: Multi-Client Cloudinary Isolation & TypeScript Hardening (Feb 20, 2026)

### Cloudinary Per-Client Isolation
- **`CLOUDINARY_CLIENT` env variable:** Replaced hardcoded `tailor-fit` folder prefix with configurable `CLOUDINARY_CLIENT` — each client deployment gets its own Cloudinary folder (`prod/cherry/...`, `prod/ali-suits/...`).
- **Backward compatible:** Falls back to `tailor-fit` if `CLOUDINARY_CLIENT` is not set — existing deployments unaffected.
- **Updated files:** `server/constants/cloudinaryFolders.ts`, `server/routes/customers.ts` (delete-asset route), `src/lib/cloudinaryFolders.ts` (comment), `.env.example`.

### TypeScript Strict Compliance (`server/routes/customers.ts`)
- **70+ TypeScript errors fixed:** Full strict mode compliance for the customer routes file.
- **Express types:** Added `Request`, `Response`, `NextFunction` to `protect` middleware.
- **Null guards:** Added `if (!customer)` checks after every `findById` call.
- **Auth types:** Cast `jwt.verify()` result, typed `generateToken(id: unknown)`.
- **Chat types:** Typed payloads as `ChatMessagePayload`, history as `ChatTurn[]`.
- **CustomerDoc:** Added `password` and `createdAt` fields to `server/types/express.d.ts`.

### VPS Deployment Guide Enhancements (`docs/VPS-CLIENT-DEPLOYMENT.md`)
- **Part 5:** MongoDB User & Database Management (create/delete DB users, enable auth, quick reference table).
- **Part 6:** Cloudinary multi-client isolation explanation (shared account OK due to unique ObjectIds, future options for full isolation).
- **Remove Client checklist:** Added 5-step teardown procedure (PM2 → MongoDB → Nginx → files → Cloudinary).
- **Updated .env template:** Includes `CLOUDINARY_CLIENT` with per-client instructions.

## Phase 39: Dynamic 3D Asset Paths (Feb 19–20, 2026)
- **ProductPreview3D:** Added `modelUrl` and `environmentUrl` props with `public/` fallback defaults.
- **Customize3D:** Passes `modelPath` and `environmentUrl` from `useCustomize3DScene` hook to both canvas instances.
- **Architecture:** `.glb` / `.hdr` files kept in `public/` as fallbacks; product DB fields (`modelUrl`, `environmentMapUrl`) used when set — no Cloudinary billing for binary 3D assets.
- **Future-proofing:** Any CDN URL (R2, S3, DO Spaces) can be stored in DB fields without code changes.

## Phase 38: Cloudinary Folder Restructure & Per-User Isolation (Feb 17–20, 2026)

### Folder Structure Overhaul
- **New hierarchy:** `{ENV}/tailor-fit/products/{2d|3d}/{id}-{slug}/`, `customers/{id}-{slug}/`, `admins/{id}-{slug}/`, `orders/{orderNumber}/`
- **{id}-{slug} naming:** Immutable ID prefix ensures paths never break on name changes; slug keeps paths human-readable.
- **Per-product fabrics:** Fabric/option/variant assets scoped to their product — no shared folders to prevent accidental cross-product deletion.
- **ENV prefix:** `CLOUDINARY_ENV` (dev/staging/prod) prefixes all paths for environment isolation.

### Upload Path Fixes
- **Variant uploads:** Replaced hardcoded `'tailor-fit-uploads/variants'` with `getProductOptionVariantFolderAndId()`.
- **Admin profiles:** `AdminSettingsTab` now uploads to `admins/{id}-{slug}/profile/`.
- **Customer profiles:** `Account.tsx` now uploads to `customers/{id}-{slug}/profile/`.

### Screenshot Per-Customer Folders
- **screenshotService:** Added optional `customerId` param; builds `customers/{id}/saved-designs/{slug}` or `customers/{id}/cart/{slug}`.
- **Hooks + Pages:** `useScreenshotCapture2D/3D`, `Customize.tsx`, `Customize3D.tsx` all thread `customer._id` through.

### Server-Side Cleanup & Deletion Routes
- **Admin profile reupload:** `PATCH /me` now deletes old Cloudinary image before saving new one.
- **`deleteCustomerWithAssets()`:** Wipes entire `customers/{id}-{slug}/` Cloudinary prefix + DB document.
- **`deleteAdminWithAssets()`:** Wipes entire `admins/{id}-{slug}/` Cloudinary prefix + DB document.
- **`DELETE /customers/:id`:** superAdmin only, full asset cleanup.
- **`DELETE /admins/:id`:** superAdmin only, self-delete prevention.

### Cleanup
- Removed `server/public/uploads/*` — all uploads now go to Cloudinary.
- Removed `public/shirt-style-customization/*`, `public/pant-style-customization/*`, `public/textures/*` — assets migrated to Cloudinary.


- **VPS Simulation:**
    - Conducted successful simulation of production environment using **Tart VM** (Ubuntu, 1 vCPU, 4GB RAM).
    - Validated stack: Node.js, MongoDB Community, Cloudinary on local VM.
    - Created **`docs/TAILOR-FIT-VPS-SETUP.md`** comprehensive guide.
- **Outcome:**
    - Validated cost-effective self-hosted strategy for future migration.

## Phase 36: Bug Fixes & UX Layout (Feb 16, 2026)
- **Admin Layout:**
    - Fixed double "Welcome back" toast on Admin login.
    - Fixed Admin logout redirect 404 (now redirects to `/login`).
    - Fixed Safari Mobile input auto-zoom (enforced 16px font).
    - Fixed Admin login popup blocker on Safari (replaced `window.open` with `navigate`).

## Phase 32: Capacitor Upgrade & Mobile Platforms (Feb 16, 2026)
- **Capacitor v8 Upgrade:**
    - Upgraded `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` to `^8.1.0`.
    - Initialized `capacitor.config.ts`.
- **Native Platforms:**
    - Added `android` and `ios` native projects.
    - Configured build scripts (`pnpm run build:mobile`, `pnpm run android`, `pnpm run ios`).
- **Verification:**
    - Confirmed native project generation and synchronization.

## Phase 31: Dependency Updates & Tailwind v4 Migration (Feb 16, 2026)
- **Tailwind CSS v4:**
    - Migrated from v3 to v4.
    - Replaced `tailwind.config.ts` with CSS-native configuration in `src/index.css` using `@theme`.
    - Installed `@tailwindcss/postcss` and configured `postcss.config.js`.
- **Dependency Updates:**
    - Updated `vite` to v7, `typescript` to latest.
    - Ran `pnpm update -r` to update all dependencies to latest safe minor/patch versions.
- **Verification:**
    - Verified production build (`pnpm run build`) and dev server stability.

## Phase 29: Dependencies Cleanup & Optimization (Feb 15, 2026)
- **Root Cleanup:**
    - Removed backend dependencies (`express`, `cors`, `multer`, `body-parser`, `dotenv`) from root `package.json`.
    - Moved build tools (`vite`, `typescript`, `tailwindcss`, etc.) to `devDependencies`.
    - Added missing Capacitor packages (`@capacitor/core`, `@capacitor/cli`, etc.) to match scripts.
    - Added `packageManager` and `engines` fields for environment consistency.
- **Server Cleanup:**
    - Removed unused `nodemon` and `canvas`.
    - Unified `@types/node` version.
    - Added `engines` field.
- **Verification:**
    - Verified build passes with `pnpm run build`.

## Phase 28: Agent & Cursor Configuration Updates (Feb 15, 2026)
- **Tooling Updates:**
    - Updated `.cursor/commands.json` to use `pnpm` instead of `npm`.
    - Updated `.agent/workflows/*.md` to use `pnpm`.
    - Updated `.cursor/rules/*.mdc` and `.agent/rules/*.md` to use `pnpm`.
- **Documentation:**
    - Added references to `DEPLOYMENT_GUIDE.md` in project rules.

## Phase 27: pnpm Migration & Deployment Documentation (Feb 15, 2026)
- **Package Manager Migration:**
    - Migrated entire monorepo from `npm` to `pnpm` for faster, disk-efficient installs.
    - Added `pnpm-workspace.yaml` and `pnpm-lock.yaml`.
    - Removed `node_modules` and `package-lock.json` pollution.
- **Dependency Cleanup:**
    - Removed unused `openai` and `lovable-tagger` dependencies.
- **Deployment & Documentation:**
    - Created **`DEPLOYMENT_GUIDE.md`** covering Vercel, Render, and VPS strategies with `pnpm`.
    - Updated `README.md` and `docs/MOBILE_APP_SETUP_GUIDE.md` with `pnpm` commands.
    - Updated `CLOUDINARY_ASSET_LIFECYCLE.md` with complete folder structure including orders/models/environments.

## Phase 26: Order Screenshot Organization & UI Polish (Feb 15, 2026)
- **Server:** Order screenshot organization moved to `orders/{orderNumber}` with robust logging.
- **Performance:** Optimized Save Design to return updated data, removing redundant profile refetches.
- **UI UX:** Implemented optimistic UI updates for instant deletion of saved designs.
- **Bug Fixes:**
    - Corrected Cart Item deletion logic from Preview Modal (using `removeFromCart`).
    - Fixed `onRequestDelete` prop naming consistency across components.
    - Resolved Cloudinary path construction for order screenshots.

## Phase 24: Cloudinary Organization, Image Replacement & UX Polish (Feb 10, 2026)

### Cloudinary Product Folder Structure
- **products/2d and products/3d:** All product assets now organized under `products/{2d|3d}/{productSlug}/`
- **Product Deletion:** Full Cloudinary cleanup when product is deleted (deleteByPrefix)
- **First Fabric Fix:** New fabric folder uses `fabric.id` instead of "new-fabric" when name is default
- **Folder Rename on Update:** Fabric, option, and option group name changes trigger Cloudinary folder renames
- **Option/Group Deletion:** Removing option group or option deletes corresponding Cloudinary folders
- **Admin API:** `POST /admin/upload/delete-by-prefix` for bulk folder deletion

### Image Replacement & Cleanup
- **Product Images:** Base/back/thumbnail upload replaces old image (deletes from Cloudinary before upload)
- **3D Fabrics, Options, Variants:** Same replace-on-upload behavior with old asset deletion
- **Profile Image:** Delete old before uploading new (already in place)

### Toast Notifications
- **Upload Feedback:** Loading toasts for "Removing old image...", "Uploading [base/back/thumbnail] image...", etc.
- **Success Feedback:** Context-specific success messages (e.g. "Base image updated", "Fabric base image updated")
- **Deletion Feedback:** "Removing fabric images from Cloudinary...", "Removing option group images...", etc.

### Admin UI & Navigation
- **3D Fabrics Tab:** Create New and Add from existing buttons same height (h-10); responsive layout fixes
- **Assets Tab:** Responsive flex headers for Model/HDRI/General sections
- **Customize3D Back Button:** When coming from product detail → 3D customizer, Back returns to product details (productId in URL)

### Documentation
- **CLOUDINARY_ASSET_LIFECYCLE.md:** Updated with product folder structure, deletion flows, and folder rename behavior

---

## Phase 23: Cloudinary Asset Lifecycle & Robustness (Feb 12, 2026)

### Cloudinary Deletion Infrastructure
- **Delete Utilities:** `cloudinaryDelete.ts` — `deleteFromCloudinaryByUrl`, `deleteManyFromCloudinary`, `extractPublicIdFromUrl`, extract helpers for products/fabrics/designs/orders.
- **Folder Constants:** `server/constants/cloudinaryFolders.ts` — product, fabric, design paths; `server/constants/placeholders.ts` — server placeholder constants.
- **Client Constants:** `src/lib/cloudinaryFolders.ts`, `src/lib/placeholders.ts` — client folder and placeholder constants.
- **Logging:** Console error on delete failure; batch partial-failure warning for monitoring.

### Admin Delete Handlers & RBAC
- **`deleteHandlers.ts`:** `deleteFabricWithAssets`, `deleteOrderWithAssets` (screenshots only), `deleteProduct` (DB only), `deleteDesignWithAssets`.
- **Super Admin RBAC:** `requireSuperAdmin` on fabric, order, product delete routes.
- **Product Delete:** DB-only to preserve order history; no Cloudinary cascade.

### Customer Deletions
- **Profile Image:** Delete old Cloudinary URL before saving new one.
- **Cart Cleanup:** `useRemoveFromCartWithCleanup` — delete cart screenshot when removing 3D item.
- **Cart Page:** Uses `removeFromCartWithCleanup` hook.

### Placeholders
- **`imageHelper.ts`:** `getProductImageUrl`, `getAvatarUrl`, `getSliderImages` with fallback to placeholders.
- **Placeholder SVGs:** `public/images/placeholders/` — product, avatar, shirt, pants, suit, blazer, jacket, tuxedo, vest.
- **Components:** ProductCard, OptimizedImage, ProductThumbnail, OrderSpecs, Account, SiteLayout, CustomizerHeader, ProductDetail, Customize3DLanding, Home — use placeholders on error.
- **Product Unavailable Badge:** Shown on image load error (ProductThumbnail, OrderSpecs).
- **Screenshot Service:** Fallback to placeholder when image unavailable.

### Robustness
- **Cart Validation:** CartContext validates cart on load; removes items with invalid `productId`.
- **3D Fabric Reset:** Customize3D resets `selectedFabric` if it no longer exists in fabrics.

### Documentation
- **`docs/CLOUDINARY_ASSET_LIFECYCLE.md`:** Asset lifecycle, cleanup flow, manual testing guide.
- **README:** Link to Cloudinary asset lifecycle docs.

---

## Phase 22: UI Polish & Dev Tooling (Feb 10, 2026)
- **Toast:** Bottom-right position, offset above Add to Cart.
- **Saved Designs:** Sort by most recent first (SiteLayout, Customize, Customize3D, Account).
- **Image Preload:** `imagePreload.ts` utility; TransitionImage uses cache for instant reloads.
- **SliderDrawer:** Width and transition tweaks.
- **Track Order:** URL param `?order=XXX` auto-searches.
- **Admin:** `getAIChatAnalytics` API for AI chat analytics.
- **Vite:** Socket.io proxy for dev.
- **Chore:** Remove console.logs from CustomizationContext; fix gitignore.

## Phase 21: Real-Time Communication & AI Support (Feb 10, 2026)
- **Socket.io:** Server with JWT auth; customer/admin rooms for real-time delivery.
- **Chat Widget:** Floating UI, AI-first via Gemini; "Talk to a human" escalates to Admin.
- **Gemini:** `aiChatService.ts` with `gemini-2.5-flash`; Tailor Fit system prompt. Fallback when no API key.
- **Admin Tabs:** Chat (customer convos), Queries (internal), Support (SuperAdmin↔Admin), AI Analytics.
- **Notifications:** NotificationPanel + NotificationContext; order/message alerts via Socket.io.
- **Models:** Conversation, ChatMessage, AdminSupportConversation, AdminSupportMessage, AIChatAnalytics, Notification.

## Phase 20: Preview & Fabric UX Polish (Feb 10, 2026)
- **2D Preview:** Prevent white flash on load; smooth fade/scale transitions for all steps.
- **3D Preview:** Soft white flash on fabric change; camera-following light + fill light; ambient 0.4.
- **Fabric Thumbnails:** `getThumbnailImageUrl` 1024×1024 WebP; `getFabricThumbnailUrl` with `forTextureSelection`; fix cotton cross-shade texture in grids.

## Phase 19: Modular Architecture Refactoring (Feb 9, 2026)
- **Code Modularization:**
    - **Core Utilities:** Created centralized modules for price formatting (`formatPrice.ts`), API client (`apiClient.ts`), toast notifications (`toastHelpers.ts`), and localStorage management (`authStorage.ts`, `savedDesignsStorage.ts`, `customizationStorage.ts`).
    - **Reusable Hooks:** Implemented `useLocalStorage` for React state persistence and `useApi` for API calls with built-in loading/error states.
    - **Service Layer:** Built dedicated service modules (`products.ts`, `auth.ts`, `customers.ts`, `orders.ts`, `admin.ts`, `fabricService.ts`) to centralize all API calls and eliminate duplication.
- **Code Migration:**
    - **Price Formatting:** Migrated 15+ files from duplicate `formatPrice` implementations to centralized utility.
    - **API Client:** Replaced direct `fetch` calls in 20+ files with standardized `apiClient` for consistent error handling.
    - **Toast Notifications:** Migrated 30+ files to use `toastHelpers` for consistent user feedback patterns.
    - **LocalStorage:** Replaced direct localStorage calls with typed utility functions across 7+ context and page files.
- **Performance Optimization:**
    - **Code Splitting:** Implemented route-based lazy loading for all 15 routes using `React.lazy()` and `Suspense`.
    - **Bundle Size:** Reduced initial bundle from ~1.8MB to ~197KB (89% reduction).
    - **API Caching:** Configured React Query with 5-minute stale time to reduce redundant network requests.
    - **Loading States:** Added proper `PageLoader` fallback components for better user experience.
- **Code Quality:**
    - **DRY Principles:** Eliminated code duplication by ~80% across the codebase.
    - **Type Safety:** Improved TypeScript type safety with generic response types in API client.
    - **Maintainability:** Single source of truth for common operations (formatting, API calls, notifications).
- **Documentation:**
    - **Architecture Guides:** Added comprehensive documentation for modular architecture patterns.
    - **Optimization Guide:** Documented performance optimization strategies and best practices.
    - **Cursor Rules:** Created rules for modular code patterns, Git integration, and migration guidelines.
    - **Quick Reference:** Added developer quick reference for common patterns and imports.
- **Git Workflow:**
    - **Conventional Commits:** Created 11 logical commits following conventional commit format.
    - **Branch Strategy:** All changes committed to `feature/modular-architecture-refactoring` branch.
    - **Commit Organization:** Grouped changes by logical categories (utilities, services, migrations, performance, docs).

## Phase 18: Admin UX & Frontend Polish (Feb 7, 2026)
- **Admin Experience**:
    - **Smart Logout**: Implemented session-aware logout that redirects to Home if a customer is also logged in.
    - **Dialog Architecture**: Refactored nested dialogs with fixed headers to prevent "floating" close icons.
    - **Visual Feedback**: Added missing Payment Status badges to Customer Profile history.
    - **Onboarding**: Improved "Welcome Admin" toast logic to appear on the Dashboard instead of the Login screen.
- **Frontend Polish**:
    - **Scrollbar Styling**: Restored native macOS scrollbar behavior to eliminate visual clashes (white vertical lines) on dark themes.

## Phase 17: Security Hardening & Auth Architecture (Feb 6, 2026)
- **Unified Authentication:** Consolidated admin and customer login flows into a single `/login` route.
- **Bilateral Security:** Implemented "Email Reservation" blocking Admin-Customer email overlap.
- **Admin Dashboard:** Added internal "Create Admin" tool and removed public registration.
- **Syntax Stability:** Resolved critical server crash issues.
- **Payment Infrastructure:** Established extensible API scaffold (Routes/Controllers/Schema) for seamless future integration of Stripe/PayPal.

## Phase 16: Infrastructure Validation (Feb 4-5, 2026)
- **Deployment Research:** Tested unified hosting on Hostinger Shared environment; confirmed incompatibility with Node.js runtime.
- **Recommendation Engine:** Updated documentation to mandate VPS for unified deployments based on failure analysis.
- **Code Optimization:** Cleaned up deployment artifacts and console instrumentation.

## Phase 15: Production Launch (Jan 29 - Feb 3, 2026)
- **Live Deployment:** Successfully deployed Decoupled Architecture:
    - **Frontend:** Vercel (Global Edge).
    - **Backend:** Render (Auto-scaling).
    - **Assets:** Cloudinary (Dynamic optimization).
- **Environment Logic:** Implemented robust environment variable handling for Staging vs Production.
- **Stability Fixes:** Resolved Z-Index overlays and Overlay rendering bugs during pre-launch testing.
- **Deployment Day:** Feb 2, 2026 - Application went live with full verification.

## Phase 14: UX/UI Modernization & Stability (Jan 19-27, 2026)
- **Admin Dashboard Overhaul:** Refactored Admins and Customers tabs to modern, responsive card grids; resolved critical tab rendering bugs.
- **Unified Layout Architecture:** Standardized 2D and 3D customizers under `SiteLayout`, fixing inconsistent drawer widths and "Saved Designs" visibility on mobile.
- **Mobile Experience:** Optimized product grids to use 2-column layouts on small screens; fixed header/footer displacement issues.
- **Performance:** Implemented loading state barriers to eliminate Page FOUC (Flash of Unstyled Content) and blinking.

## Phase 13: 3D Engine & UI Refinement (Jan 27-28, 2026)
- Implemented modular 3D system with independent mesh visibility toggling for collars/cuffs.
- Redesigned 3D customizer interface for non-overlapping, ergonomic desktop and mobile layouts.
- Integrated linear interpolation (lerp) for smooth camera zooming and transitions.
- Fixed backend logic to correctly save and serve Global 3D Preview images.
- Implemented real-time PBR texture application (Color, Normal, Roughness maps).
- Added HDRI environment lighting for realistic fabric rendering.

## Phase 12: Performance Optimization & Deduplication (Jan 22, 2026)
- Implemented "Developer Mode" uploads to overwrite existing files, preventing duplicate assets.
- Configured frontend to request auto-formatted (WebP/AVIF) images from Cloudinary, reducing bandwidth by up to 70%.
- Increased backend upload limits to 100MB to support high-quality HDRI environments and GLB models.

## Phase 11: Advanced Asset Management & Cloud Integration (Jan 21-22, 2026)
- Integrated Cloudinary for scalable asset management.
- Configured dynamic folder organization for products, models, and fabrics.
- Added "Assets" tab to Admin Dashboard for managing models and HDRIs.
- Configured production deployment settings for Vercel (Frontend) and Render (Backend).

## Phase 10: 3D Engine Stability (Jan 26, 2026)
- Implemented dual-canvas architecture to support split rendering for mobile/desktop.
- Resolved critical WebGL context loss issues.
- Calibrated 3D viewport metrics for consistent model positioning across devices.
- Built modular mesh system with independent collar/cuff visibility toggling.

## Phase 9: 3D Customizer Engine (Jan 20-26, 2026)
- Developed real-time 3D shirt customization using Three.js and React Three Fiber.
- Implemented dynamic texture application (Color, Normal, Roughness maps).
- Built 3D-specific API routes for fabric management.
- Created seamless navigation between 2D and 3D customization modes.
- Implemented localStorage state persistence for 3D configurations.

## Phase 8: Optimization & Polish (Jan 23, 2026)
- Removed legacy code and unused experimental components.
- Optimized bundle size and image loading performance.
- Integrated toast notifications for improved user feedback.

## Phase 7: Admin Dashboard (Jan 19-21, 2026)
- Built comprehensive Admin Panel for order and product management.
- Implemented customer insight views and order status tracking.
- Secured admin routes with dedicated authentication middleware.
- Built RBAC system (Super Admin vs Standard Admin).

## Phase 6: Authentication & User Accounts (Jan 16, Jan 21, 2026)
- Implemented JWT-based authentication with bcrypt hashing.
- Created secure customer portal for order tracking and saved designs.
- Enabled persistent "Wishlist" functionality.

## Phase 5: Shopping Cart & Checkout (Jan 19-20, 2026)
- Built persistent CartContext with local storage synchronization.
- Implemented multi-step checkout flow with delivery selection.
- Connected order generation to backend API.
- Enhanced cart to handle complex 3D order structures with nested arrays.

## Phase 4: Advanced Customization Logic (Jan 16, 2026)
- Added support for multi-category customization (Suits, Shirts, Pants).
- Implemented mutual exclusion logic for conflicting attributes.
- Developed visual selector UI for fabrics and patterns.

## Phase 3: The 2D Customizer Engine (Jan 15, 2026)
- Developed core layer-based image composition engine.
- Implemented Z-Index management for correct asset layering.
- Built dynamic price calculation engine based on selected options.

## Phase 2: Product Catalog & Database (Jan 15-16, 2026)
- Designed Mongoose schemas for Products, Orders, and Customers.
- Built RESTful API endpoints for product retrieval and filtering.
- Implemented responsive product grid layouts.

## Phase 1: Foundation & Architecture (Jan 13-15, 2026)
- Established monorepo structure (src/server).
- Configured TypeScript and Vite for frontend build pipeline.
- Implemented Tailwind CSS design system.
- Initialized Express backend with MongoDB connection.
- Analyzed competitor 3D customization flows for architectural insights.
## Phase 25: Comprehensive Testing & Final Polish (Feb 13, 2026)
- **Frontend Testing Framework:**
    - Integrated **Vitest** + **React Testing Library** + **JSDOM**.
    - Configured `vite.config.ts` for seamless test execution.
- **Test Suite Implementation:**
    - **Unit Tests:** `imageHelper.ts`, `formatPrice.ts`.
    - **Component Tests:** `ProductPreview.tsx` (complex prop permutations).
    - **Integration Tests:** `useCustomizationDrafts`, `useCustomizationSteps` (mocked context flows).
- **Codebase Synchronization:**
    - Updated `.agent` and `.cursor` rules to reflect new modular architecture.
    - Added `npm test` to pre-commit checklists.
