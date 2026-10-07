// 3D shirt preview. Used in saved design modal, Customize3D page right-side preview area.
// Assigns collar/cuff/placket/pocket fabric textures. Buttons use placketButton/cuffButton colors.
import React, { Suspense, forwardRef, useImperativeHandle, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html, Decal } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getTextureUrl } from '@/services/fabricService';
import { loadCachedTexture, textureCache, loadingPromises } from '@/utils/textureCache';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Preconfigure KTX2Loader for performance
const ktx2Loader = new KTX2Loader().setTranscoderPath('/basis/');

// Config from saved design modal or Customize3D. Needs fabric plus collar/cuff/placket/pocket fabrics.
interface ThreeDConfig {
    fabric: any;
    collar: string;
    cuff: string;
    pocket: string;
    collarButton?: string;
    placketButton?: string;
    cuffButton?: string;
    collarFabric?: any;
    cuffFabric?: any;
    placketFabric?: any;
    pocketFabric?: any;
    placket?: string;
    collarEdgeColor?: string;
    collarStitchColor?: string;
    cuffEdgeColor?: string;
    cuffStitchColor?: string;
    placketEdgeColor?: string;
    placketStitchColor?: string;
    pocketEdgeColor?: string;
    pocketStitchColor?: string;
    monogramText?: string;
    monogramFont?: string;
    monogramColor?: string;
    monogramPosition?: string;
}

interface ProductPreview3DProps {
    productType: 'shirt' | 'pants' | 'suit';
    config: ThreeDConfig;
    viewMode: 'front' | 'back';
    zoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetView?: () => void;
    className?: string;
    showControls?: boolean;
    /** URL to the .glb model file (Cloudinary). Required — no local fallback. */
    modelUrl?: string;
    /** URL to the .hdr environment map (Cloudinary). Required — no local fallback. */
    environmentUrl?: string;
    /** Callback fired when the model and initial textures are fully loaded and applied */
    onSceneReady?: () => void;
}

// Tracks first load - calls onLoaded only when the main textures signify they are ready
function FirstLoadTracker({ children, onLoaded, ready }: { children: React.ReactNode; onLoaded: () => void; ready: boolean }) {
    useEffect(() => {
        if (ready) {
            onLoaded();
        }
    }, [ready, onLoaded]);
    return <>{children}</>;
}

// Controls camera z for zoom. Used inside 3D preview canvas.
function CameraController({ zoom }: { zoom: number }) {
    const { camera } = useThree();
    useEffect(() => {
        camera.position.z = zoom;
        camera.updateProjectionMatrix();
    }, [zoom, camera]);
    return null;
}

// Removed CameraLight because static lighting provides more consistent results for the front/back camera snap



// Loads color/normal/roughness maps from fabric. Uses cache to avoid Suspense blanking.
function useFabricTextures(fabric: any) {
    const isValidUrl = (url: string | undefined) => url && url.length > 5 && !url.includes('undefined') && !url.includes('null');

    const colorUrl = fabric && (isValidUrl(fabric.colorMapUrl) || isValidUrl(fabric.image))
        ? getTextureUrl(fabric.colorMapUrl || fabric.image) : null;
    const normalUrl = fabric && isValidUrl(fabric.normalMapUrl) ? getTextureUrl(fabric.normalMapUrl) : null;
    const roughnessUrl = fabric && isValidUrl(fabric.roughnessMapUrl) ? getTextureUrl(fabric.roughnessMapUrl) : null;

    // Debug: log which texture maps are available for the fabric
    useEffect(() => {
        if (fabric) {
            console.log('[3D Textures]', fabric.name || 'unknown fabric', {
                colorMap: colorUrl ? '✓' : '✗ (missing colorMapUrl)',
                normalMap: normalUrl ? '✓' : '✗ (missing normalMapUrl — normalScale will have no effect)',
                roughnessMap: roughnessUrl ? '✓' : '✗ (missing roughnessMapUrl)',
                normalScale: fabric.normalScale ?? 'not set (default 1)',
            });
        }
    }, [fabric?.name, colorUrl, normalUrl, roughnessUrl]);

    // Force re-render when async texture finishes loading
    const [, forceUpdate] = useState(0);

    // Track previous textures to show while new ones load
    const prevTexturesRef = useRef<{ colorMap: THREE.Texture | null; normalMap: THREE.Texture | null; roughnessMap: THREE.Texture | null }>({
        colorMap: null, normalMap: null, roughnessMap: null
    });

    // Try to get textures from cache (may return null if still loading)
    const cachedColor = colorUrl ? loadCachedTexture(colorUrl) : null;
    const cachedNormal = normalUrl ? loadCachedTexture(normalUrl) : null;
    const cachedRoughness = roughnessUrl ? loadCachedTexture(roughnessUrl) : null;

    // Poll for completion when textures are loading
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        const urls = [colorUrl, normalUrl, roughnessUrl].filter(Boolean) as string[];
        const pendingUrls = urls.filter(url => !textureCache.has(url));
        if (pendingUrls.length === 0) {
            setIsLoaded(true);
            return;
        }

        setIsLoaded(false);
        // Wait for all pending textures then trigger re-render
        Promise.all(pendingUrls.map(url => loadingPromises.get(url) || Promise.resolve())).then(() => {
            setIsLoaded(true);
            forceUpdate(n => n + 1);
        });
    }, [colorUrl, normalUrl, roughnessUrl]);

    // Fallback texture when no valid color URL
    const fallbackTexture = useMemo(() => {
        if (colorUrl) return null;
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#e19f2cff';
            ctx.fillRect(0, 0, 64, 64);
            for (let i = 0; i < 100; i++) {
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, [colorUrl]);

    // Dispose fallback texture to prevent GPU memory leak
    useEffect(() => {
        return () => {
            if (fallbackTexture) {
                fallbackTexture.dispose();
            }
        };
    }, [fallbackTexture]);

    return useMemo(() => {
        const applySettings = (tex: THREE.Texture | null, isColor: boolean) => {
            if (!tex) return null;
            tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(6, 6);
            // Critical: re-apply anisotropic filtering here inside the R3F context.
            // The old `useTexture` (Drei) did this automatically via the renderer.
            // Without these, `needsUpdate` can lose the filter settings.
            tex.anisotropy = 4;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.needsUpdate = true;
            return tex;
        };

        // Use cached texture if available, else fall back to previous texture
        const finalColor = applySettings(cachedColor || prevTexturesRef.current.colorMap || fallbackTexture, true);
        const finalNormal = applySettings(cachedNormal || prevTexturesRef.current.normalMap, false);
        const finalRoughness = applySettings(cachedRoughness || prevTexturesRef.current.roughnessMap, false);

        // Update previous texture refs when we get new loaded textures
        if (cachedColor) prevTexturesRef.current.colorMap = cachedColor;
        if (cachedNormal) prevTexturesRef.current.normalMap = cachedNormal;
        if (cachedRoughness) prevTexturesRef.current.roughnessMap = cachedRoughness;

        return {
            colorMap: finalColor,
            normalMap: normalUrl ? finalNormal : null,
            roughnessMap: roughnessUrl ? finalRoughness : null,
            isLoaded // Pass loaded state out
        };
    }, [cachedColor, cachedNormal, cachedRoughness, colorUrl, normalUrl, roughnessUrl, fallbackTexture, isLoaded]);
}

import { COLLAR_OPTIONS, CUFF_OPTIONS, POCKET_OPTIONS, PLACKET_OPTIONS, MONOGRAM_FONTS } from '@/constants/shirtOptions3D';

function MonogramDecal({ scene, config }: { scene: THREE.Group, config: ThreeDConfig }) {
    const { monogramText, monogramFont, monogramColor, monogramPosition } = config;
    const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
    const [canvasAspect, setCanvasAspect] = useState(1);

    // Create the canvas texture whenever text/font/color changes
    useEffect(() => {
        if (!monogramText) return;

        const canvas = document.createElement('canvas');
        // Use a higher resolution canvas for crisp edges
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const fontFamily = MONOGRAM_FONTS.find(f => f.id === monogramFont)?.family || 'Arial';

        // Fixed font size so the physical height of the text never shrinks!
        const fontSize = 400;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        const textWidth = ctx.measureText(monogramText).width;

        // Resize canvas to tightly wrap the text (with padding for shadow).
        // Height is fixed relative to font size.
        const cHeight = Math.ceil(fontSize * 1.5);
        const cWidth = Math.max(cHeight, Math.ceil(textWidth + 120));

        canvas.width = cWidth;
        canvas.height = cHeight;

        // Resizing canvas clears context, so we re-apply styles
        const newCtx = canvas.getContext('2d');
        if (!newCtx) return;

        newCtx.clearRect(0, 0, canvas.width, canvas.height);
        const fillColor = monogramColor || '#ffffff';
        newCtx.font = `bold ${fontSize}px ${fontFamily}`;
        newCtx.textAlign = 'center';
        newCtx.textBaseline = 'middle';
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Layer 1: Dark shadow stroke underneath to simulate embroidery depth
        newCtx.save();
        newCtx.strokeStyle = 'rgba(0,0,0,0.5)';
        newCtx.lineWidth = 8;
        newCtx.shadowColor = 'rgba(0,0,0,0.6)';
        newCtx.shadowBlur = 10;
        newCtx.shadowOffsetX = 2;
        newCtx.shadowOffsetY = 3;
        newCtx.strokeText(monogramText, cx, cy);
        newCtx.restore();

        // Layer 2: Main fill color
        newCtx.save();
        newCtx.fillStyle = fillColor;
        newCtx.shadowColor = 'rgba(0,0,0,0.3)';
        newCtx.shadowBlur = 4;
        newCtx.shadowOffsetY = 2;
        newCtx.fillText(monogramText, cx, cy);
        newCtx.restore();

        // Layer 3: Top highlight stroke to simulate light catching the raised thread
        newCtx.save();
        newCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        newCtx.lineWidth = 2;
        newCtx.shadowBlur = 0;
        newCtx.strokeText(monogramText, cx, cy - 1);
        newCtx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        tex.colorSpace = THREE.SRGBColorSpace;

        setCanvasAspect(canvas.width / canvas.height);
        setTexture(tex);

        return () => tex.dispose();
    }, [monogramText, monogramFont, monogramColor]);

    const targetData = useMemo(() => {
        if (!monogramText || !monogramPosition) return null;

        let locator: THREE.Object3D | null = null;
        let mesh: THREE.Mesh | null = null;
        const posLower = monogramPosition.toLowerCase();

        // Step 1: Find the locator empty axis
        scene.traverse((child) => {
            if (child.name === monogramPosition) locator = child;
        });

        // Step 2: Determine target mesh by looking up the EXACT selected mesh name from config
        // This avoids fragile substring matching that broke on names like "MOD_Button_Down_Spread_Collar"
        let targetMeshName: string | null = null;

        if (posLower.includes('chest')) {
            targetMeshName = 'MOD_Front_Back';
        } else if (posLower.includes('collar')) {
            // First check if the special support mesh is present in the scene
            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh && child.name.toLowerCase().includes('collar_inside_text_support')) {
                    mesh = child as THREE.Mesh;
                }
            });
            // If not found, use the standard selected collar mesh name
            if (!mesh) {
                const collarOption = COLLAR_OPTIONS.find(o => o.id === config.collar);
                if (collarOption) targetMeshName = collarOption.meshName;
            }
        } else if (posLower.includes('pocket')) {
            const pocketOption = POCKET_OPTIONS.find(o => o.id === config.pocket);
            if (pocketOption) targetMeshName = pocketOption.meshName;
        } else if (posLower.includes('cuff')) {
            const cuffOption = CUFF_OPTIONS.find(o => o.id === config.cuff);
            if (cuffOption) targetMeshName = cuffOption.meshName;
        }

        // Step 3: Find the mesh by exact name (no visibility check needed — we know what we want)
        if (!mesh && targetMeshName) {
            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh && child.name === targetMeshName) {
                    mesh = child as THREE.Mesh;
                }
            });
        }

        // Step 3b: If exact name didn't match, fall back to category-based substring search
        // Handles cases where the meshName in constants doesn't match the actual GLB mesh name
        // (e.g. config says "Standard_Chest_Pocket" but GLB has "MOD_Pocket_Chest")
        if (!mesh && targetMeshName) {
            const category = posLower.includes('collar') ? 'collar'
                : posLower.includes('cuff') ? 'cuff'
                    : posLower.includes('pocket') ? 'pocket'
                        : null;

            if (category) {
                scene.traverse((child) => {
                    if (!mesh && (child as THREE.Mesh).isMesh) {
                        const childLower = child.name.toLowerCase();
                        // Match category keyword but exclude edge/stitch/button helper meshes
                        if (childLower.includes(category) && !childLower.includes('edge') && !childLower.includes('stitch')) {
                            mesh = child as THREE.Mesh;
                        }
                    }
                });
            }
        }

        // Step 4: Fallback to main body mesh
        if (!mesh) {
            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh && child.name === 'MOD_Front_Back') {
                    mesh = child as THREE.Mesh;
                }
            });
        }

        console.log(`[Monogram Debug] Position: ${monogramPosition} | Locator: ${locator?.name ?? 'NULL'} | Target Mesh Name: ${targetMeshName} | Selected Mesh: ${mesh?.name ?? 'NULL'}`);

        return { locator, mesh };
    }, [scene, monogramPosition, monogramText, config.collar, config.cuff, config.pocket]);

    const meshRef = useRef<THREE.Mesh>(null);

    if (!targetData?.locator || !targetData?.mesh || !texture) return null;

    // Ensure matrices are fresh before calculating positions
    scene.updateMatrixWorld(true);

    // 1. POSITION: Convert world position to local space of the mesh
    const worldPos = new THREE.Vector3();
    targetData.locator.getWorldPosition(worldPos);
    const localPos = targetData.mesh.worldToLocal(worldPos.clone());

    // 2. ROTATION: Convert world quaternion to local space of the mesh
    const worldQuat = new THREE.Quaternion();
    targetData.locator.getWorldQuaternion(worldQuat);
    const meshWorldQuat = new THREE.Quaternion();
    targetData.mesh.getWorldQuaternion(meshWorldQuat);
    const localQuat = worldQuat.clone().premultiply(meshWorldQuat.invert());
    const localEuler = new THREE.Euler().setFromQuaternion(localQuat);

    // 3. SCALE: Convert world scale to local space of the mesh
    const worldScale = new THREE.Vector3();
    targetData.locator.getWorldScale(worldScale);
    const meshWorldScale = new THREE.Vector3();
    targetData.mesh.getWorldScale(meshWorldScale);

    // We add depth to the Z scale to ensure the projection volume pierces the fabric surface
    const localScale = worldScale.clone().divide(meshWorldScale);

    // Multiply the X scale by the canvas aspect ratio so the Decal widens to fit the string length!
    // This allows the text HEIGHT to be controlled by Blender, while the WIDTH organically grows.
    localScale.x = localScale.y * canvasAspect;
    localScale.z = Math.max(localScale.z, 0.5); // Ensure at least 0.5 units of depth

    // Render the Decal as a direct child of the target mesh using createPortal
    // This perfectly syncs the Decal with the Blender Empty!
    return createPortal(
        <Decal
            name="monogram-decal"
            position={localPos}
            rotation={localEuler}
            scale={localScale}
        >
            <meshStandardMaterial
                map={texture}
                transparent
                polygonOffset
                polygonOffsetFactor={-4}
                roughness={0.7}
                metalness={0.05}
                depthTest={true}
                depthWrite={false}
            />
        </Decal>,
        targetData.mesh
    );
}

// Clones shirt GLB, shows selected collar/cuff/pocket/placket meshes, applies fabric textures.
function ModularModel3D({ config, viewMode, scene, onReady }: { config: ThreeDConfig, viewMode: 'front' | 'back', scene: THREE.Group, onReady?: (ready: boolean) => void }) {
    const meshRef = useRef<THREE.Group>(null);
    // When viewMode is 'back', spin the object 180 degrees so it faces the front main lighting
    const targetRotation = viewMode === 'front' ? 0 : Math.PI;

    const { invalidate } = useThree();
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation, 0.1);
            // If the rotation hasn't reached the target, keep requesting frames
            if (Math.abs(meshRef.current.rotation.y - targetRotation) > 0.005) {
                invalidate();
            }
        }
    });

    // Load textures for all components
    // If a component fabric is missing, fallback to main fabric
    const mainTextures = useFabricTextures(config.fabric);
    const collarTextures = useFabricTextures(config.collarFabric || config.fabric);
    const cuffTextures = useFabricTextures(config.cuffFabric || config.fabric);
    const pocketTextures = useFabricTextures(config.pocketFabric || config.fabric);
    const placketTextures = useFabricTextures(config.placketFabric || config.fabric);

    useEffect(() => {
        if (onReady) {
            onReady(!!mainTextures.isLoaded);
        }
    }, [mainTextures.isLoaded, onReady]);

    // Find selected mesh names
    const selectedCollarMesh = COLLAR_OPTIONS.find(c => c.id === config.collar)?.meshName || '';
    const selectedCuffMesh = CUFF_OPTIONS.find(c => c.id === config.cuff)?.meshName || '';
    const selectedPocketMesh = POCKET_OPTIONS.find(p => p.id === config.pocket)?.meshName || '';
    const selectedPlacketMesh = PLACKET_OPTIONS.find(p => p.id === config.placket)?.meshName || '';

    const allCollarMeshes = useMemo(() => COLLAR_OPTIONS.map(c => c.meshName), []);
    const allCuffMeshes = useMemo(() => CUFF_OPTIONS.map(c => c.meshName), []);
    const allPocketMeshes = useMemo(() => POCKET_OPTIONS.map(p => p.meshName), []);
    const allPlacketMeshes = useMemo(() => PLACKET_OPTIONS.map(p => p.meshName), []);

    const alwaysVisible = useMemo(() => [
        'Front_Back', 'Full_Sleeves_Left', 'Full_Sleeves_Right',
        "Men's_Shirt",
        'MOD_Front_Back', 'MOD_Sleeves',
        // User provided specific names (handling potential typos or exact matches)
        'MOD_Sleeves_Full'
    ], []);

    // Clone the scene and its materials exactly ONCE on mount or when original scene changes
    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;

                // Clone material so we don't mutate the global cached GLTF model materials
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material = mesh.material.map(m => m.clone());
                    } else {
                        mesh.material = (mesh.material as THREE.Material).clone();
                    }
                }

                // Ensure all materials are MeshStandardMaterial and clear embedded textures.
                // The GLB model ships with a high-frequency normal map (`Men's Shirt_normal_1001`)
                // that causes moiré lines at oblique angles. We clear all embedded maps here
                // so only our dynamically applied fabric textures render.
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((rawMat, idx) => {
                    if (!rawMat || rawMat.type !== 'MeshStandardMaterial') {
                        const newMat = new THREE.MeshStandardMaterial({
                            color: '#ffffff',
                            roughness: 1.0,
                            metalness: 0,
                            side: THREE.DoubleSide
                        });
                        if (Array.isArray(mesh.material)) {
                            mesh.material[idx] = newMat;
                        } else {
                            mesh.material = newMat;
                        }
                    } else {
                        const stdMat = rawMat as THREE.MeshStandardMaterial;
                        stdMat.side = THREE.DoubleSide;
                        // Clear embedded textures — our fabric effect loop will set the correct ones
                        stdMat.map = null;
                        stdMat.normalMap = null;
                        stdMat.roughnessMap = null;
                        stdMat.aoMap = null;
                        stdMat.bumpMap = null;
                        stdMat.displacementMap = null;
                        stdMat.flatShading = false;
                        stdMat.needsUpdate = true;
                    }

                    // GLSL shader injection: darken the inside of the shirt (back-faces)
                    // so sleeves, neck, and bottom openings look naturally dark
                    // regardless of scene lighting angles
                    const mat = Array.isArray(mesh.material) ? mesh.material[idx] : mesh.material;
                    if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                        (mat as THREE.MeshStandardMaterial).onBeforeCompile = (shader) => {
                            shader.fragmentShader = shader.fragmentShader.replace(
                                '#include <color_fragment>',
                                `#include <color_fragment>
                                if (!gl_FrontFacing) {
                                    diffuseColor.rgb *= 0.95;
                                }
                                `
                            );
                        };
                    }
                });

                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
        return clone;
    }, [scene]);

    // Cleanup cloned materials when scene changes or component unmounts to prevent GPU memory leaks
    useEffect(() => {
        return () => {
            clonedScene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) {
                            mesh.material.forEach(m => m.dispose());
                        } else {
                            (mesh.material as THREE.Material).dispose();
                        }
                    }
                }
            });
        };
    }, [clonedScene]);

    // Mutate properties without re-creating material objects (stops GPU memory leaks/stutter)
    useEffect(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const meshName = mesh.name;

                // Skip the monogram decal mesh so its material is not overwritten
                if (meshName === 'monogram-decal') return;

                // Handle the special collar_inside_text_support mesh:
                // Keep it visible so its children (the decals) render,
                // but make the support mesh's materials invisible.
                if (meshName.toLowerCase().includes('collar_inside_text_support')) {
                    mesh.visible = true;
                    if (mesh.material) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach(mat => {
                            mat.visible = false;
                        });
                    }
                    return;
                }

                const parentName = mesh.parent?.name || '';

                // 1. Determine Material Base
                const materialName = Array.isArray(mesh.material)
                    ? mesh.material[0].name
                    : (mesh.material as THREE.Material)?.name || '';
                const isButtonMaterial = materialName.includes('Material15595') || materialName.includes('Material15575') || materialName.includes('Material15577') || materialName.includes('Material15597');

                let isVisible = true;

                // 2. Visibility Logic
                // Because gltfpack (-kn) preserves Node names but wraps the internal Mesh in 
                // nested unnamed Groups, we must search up the tree for the real name.
                const hierarchyNames = [meshName];
                let currentNode: THREE.Object3D | null = mesh.parent;
                while (currentNode && !currentNode.name.includes('Scene')) {
                    if (currentNode.name) hierarchyNames.push(currentNode.name);
                    currentNode = currentNode.parent;
                }
                let foundName = hierarchyNames.join(' ');

                const searchString = `${foundName}`.toLowerCase();
                const lowerName = searchString;
                const lowerParentName = searchString; // For backwards compat with button logic later

                // Helper to check precise mesh name match (case-insensitive)
                const hasMesh = (name: string) => searchString.includes(name.toLowerCase());

                // Generic component matchers
                // Notice: 'mod_collar' is a substring of 'mod_club_collar', so we must be precise.
                const isGenericCollar = hasMesh('mod_collar') && !hasMesh('mod_club_collar');
                const isGenericCuff = hasMesh('mod_cuffs') || hasMesh('mod_cuff');
                const isPocketEdge = hasMesh('mod_pocket_chest_edge');
                const isGenericPocket = hasMesh('mod_pocket') && !isPocketEdge;
                const isGenericPlacket = hasMesh('mod_placket') && !hasMesh('mod_placket_'); // Generic fallback if needed

                const isCollar = allCollarMeshes.some(m => hasMesh(m)) || isGenericCollar || hasMesh('collar_buttons_stiches');
                const isCuff = allCuffMeshes.some(m => hasMesh(m.replace(/_Cuff$/i, '').replace(/_Button(s)?$/i, ''))) || isGenericCuff || hasMesh('two_button_stiches') || hasMesh('cuff_elbow_buttons_stiches') || hasMesh('cuff_buttons');
                const isPocket = allPocketMeshes.some(m => hasMesh(m.replace(/_Button(s)?$/i, ''))) || isGenericPocket || isPocketEdge;
                const isPlacket = allPlacketMeshes.some(m => hasMesh(m)) || isGenericPlacket || hasMesh('placket_buttons') || hasMesh('planket_buttons');

                // Hide component if it doesn't match the *selected* style
                if (isCollar) {
                    if (selectedCollarMesh) {
                        const lowerSelected = selectedCollarMesh.toLowerCase();
                        if (lowerSelected === 'mod_collar') {
                            // If selected is MOD_Collar, only show it if it's actually the generic collar (not mod_club_collar)
                            if (!isGenericCollar) isVisible = false;
                        } else {
                            if (!hasMesh(lowerSelected)) isVisible = false;
                        }
                    } else {
                        isVisible = false;
                    }
                }

                if (isCuff) {
                    if (selectedCuffMesh) {
                        // If it's a generic cuff mesh or matches the exact selected cuff (or base name without '_cuff'), show it
                        const lowerSelected = selectedCuffMesh.toLowerCase();
                        let match = hasMesh(lowerSelected) ||
                            hasMesh(lowerSelected.replace(/_cuff$/i, '')) ||
                            isGenericCuff;
                        // Special handling for shared stitch meshes across cuff families
                        if (hasMesh('two_button_stiches') && lowerSelected.includes('two_button')) match = true;
                        if (hasMesh('cuff_elbow_buttons_stiches')) match = true;

                        if (!match) isVisible = false;
                    } else if (!isGenericCuff && !hasMesh('cuff_buttons')) {
                        isVisible = false;
                    }
                }

                if (isPocket) {
                    if (config.pocket === 'none') {
                        isVisible = false;
                    } else if (selectedPocketMesh && !hasMesh(selectedPocketMesh) && !isGenericPocket && !isPocketEdge) {
                        isVisible = false;
                    }
                }

                if (isPlacket) {
                    if (selectedPlacketMesh) {
                        let match = hasMesh(selectedPlacketMesh.toLowerCase()) || isGenericPlacket;

                        // Show generic placket buttons unless "no_buttons" is in the selected placket name (like Covered_Fly_No_Buttons)
                        const isButtonOrStitch = hasMesh('placket_buttons') || hasMesh('planket_buttons');
                        if (isButtonOrStitch && !selectedPlacketMesh.toLowerCase().includes('no_buttons')) match = true;

                        if (!match) isVisible = false;
                    } else {
                        isVisible = false;
                    }
                }

                // Ensure generic fallback meshes are visible ONLY IF no specific component was selected
                // (For collar, we removed this because it's now fully modular. Cuffs/Pockets retain fallback behavior for now)
                if (isGenericCuff) isVisible = true;
                if ((isGenericPocket || isPocketEdge) && config.pocket !== 'none') isVisible = true;

                if (alwaysVisible.some(v => searchString.includes(v.toLowerCase()))) isVisible = true;

                mesh.visible = isVisible;
                if (!isVisible) return;

                // 3. Material Updates — iterate ALL materials per mesh (handles multi-material meshes like MOD_Cuffs)
                // Fix: Only treat mesh as button if it actually ends with _buttons or is a stitch mesh. 
                // This prevents parent meshes like "MOD_Two_Button_Angle_Cuff" or "MOD_Placket_Covered_Fly_No_Buttons" from turning solid color.
                const isExplicitButtonMesh = (searchString.endsWith('_buttons') || searchString.includes('_buttons_stiches')) &&
                    !searchString.includes('no_buttons');

                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                materials.forEach(rawMat => {
                    const mat = rawMat as THREE.MeshStandardMaterial;
                    const matName = mat.name;
                    const isButtonMat = matName.includes('Material15595') || matName.includes('Material15575') || matName.includes('Material15577') || matName.includes('Material15597');

                    // MOD_Planket_Buttons or MOD_Placket_Front containing button materials
                    const isPlacketButton = (isButtonMat || isExplicitButtonMesh) &&
                        (searchString.includes('placket') || searchString.includes('planket') ||
                            meshName.includes('Shirt006'));

                    // MOD_Cuff_Buttons or MOD_Cuffs containing button materials
                    const isCuffButton = (isButtonMat || isExplicitButtonMesh) && !isPlacketButton &&
                        (searchString.includes('cuff') || searchString.includes('cuft'));

                    // Ensure generic button nodes get colored
                    const isGenericPlacketButton = searchString.includes('mod_planket_buttons');
                    const isGenericCuffButton = searchString.includes('mod_cuff_buttons');
                    const isCollarButton = searchString.includes('collar_buttons');

                    const finalPlacketButton = isPlacketButton || isGenericPlacketButton;
                    const finalCuffButton = isCuffButton || isGenericCuffButton;
                    const finalCollarButton = isCollarButton;

                    const isEdgeMesh = searchString.endsWith('_edge') || searchString.includes('_edges');
                    const isStitchMesh = searchString.includes('_stiches') || searchString.includes('_stitches');

                    if (isStitchMesh) {
                        let stitchCol = config.placketStitchColor;
                        if (searchString.includes('collar')) stitchCol = config.collarStitchColor;
                        else if (searchString.includes('cuff') || searchString.includes('cuft') || searchString.includes('two_button')) stitchCol = config.cuffStitchColor;
                        else if (searchString.includes('pocket')) stitchCol = config.pocketStitchColor;

                        mat.color.set(stitchCol || '#f8f9fa');
                        mat.roughness = 0.9;
                        mat.metalness = 0.0;
                        mat.map = null;
                        mat.normalMap = null;
                        mat.roughnessMap = null;
                        mat.needsUpdate = true;
                    } else if (isEdgeMesh) {
                        let edgeCol = config.placketEdgeColor;
                        if (searchString.includes('collar')) edgeCol = config.collarEdgeColor;
                        else if (searchString.includes('cuff') || searchString.includes('cuft')) edgeCol = config.cuffEdgeColor;
                        else if (searchString.includes('pocket')) edgeCol = config.pocketEdgeColor;

                        mat.color.set(edgeCol || '#f8f9fa');
                        mat.roughness = 0.8;
                        mat.metalness = 0.05;
                        mat.map = null;
                        mat.normalMap = null;
                        mat.roughnessMap = null;
                        mat.needsUpdate = true;
                    } else if (finalCollarButton) {
                        mat.color.set(config.collarButton || '#f8f9fa');
                        mat.roughness = 0.3;
                        mat.metalness = 0.1;
                        mat.map = null;
                        mat.normalMap = null;
                        mat.roughnessMap = null;
                        mat.needsUpdate = true;
                    } else if (finalPlacketButton) {
                        mat.color.set(config.placketButton || '#f8f9fa');
                        mat.roughness = 0.3;
                        mat.metalness = 0.1;
                        mat.map = null;
                        mat.normalMap = null;
                        mat.roughnessMap = null;
                        mat.needsUpdate = true;
                    } else if (finalCuffButton) {
                        mat.color.set(config.cuffButton || '#f8f9fa');
                        mat.roughness = 0.3;
                        mat.metalness = 0.1;
                        mat.map = null;
                        mat.normalMap = null;
                        mat.roughnessMap = null;
                        mat.needsUpdate = true;
                    } else {
                        let textures = mainTextures;
                        let sourceFabric = config.fabric;
                        let matchedComponent = 'main';

                        const checkName = (name: string) => searchString.includes(name);

                        if (checkName('collar')) {
                            textures = config.collarFabric ? collarTextures : mainTextures;
                            sourceFabric = config.collarFabric || config.fabric;
                            matchedComponent = 'collar';
                        } else if (checkName('cuff') || checkName('cuft')) {
                            textures = config.cuffFabric ? cuffTextures : mainTextures;
                            sourceFabric = config.cuffFabric || config.fabric;
                            matchedComponent = 'cuff';
                        } else if (checkName('pocket')) {
                            textures = config.pocketFabric ? pocketTextures : mainTextures;
                            sourceFabric = config.pocketFabric || config.fabric;
                            matchedComponent = 'pocket';
                        } else if (checkName('placket') || checkName('planket')) {
                            textures = config.placketFabric ? placketTextures : mainTextures;
                            sourceFabric = config.placketFabric || config.fabric;
                            matchedComponent = 'placket';
                        }

                        mat.map = textures.colorMap || null;
                        mat.normalMap = textures.normalMap || null;
                        mat.roughnessMap = textures.roughnessMap || null;
                        mat.color.set('#ffffff');
                        mat.roughness = 1.0;
                        mat.metalness = sourceFabric?.metalness || 0;

                        if (sourceFabric?.normalScale !== undefined && mat.normalScale) {
                            mat.normalScale.set(sourceFabric.normalScale, sourceFabric.normalScale);
                        } else if (mat.normalScale) {
                            mat.normalScale.set(1, 1);
                        }

                        mat.envMapIntensity = 0.3;
                        mat.needsUpdate = true;
                    }
                });
            }
        });
    }, [
        clonedScene, config, selectedCollarMesh, selectedCuffMesh, selectedPocketMesh, selectedPlacketMesh,
        mainTextures, collarTextures, cuffTextures, pocketTextures, placketTextures,
        allCollarMeshes, allCuffMeshes, allPocketMeshes, allPlacketMeshes, alwaysVisible
    ]);

    return (
        <group ref={meshRef} position={[0, 0, 0]}>
            <primitive object={clonedScene} scale={[0.030, 0.030, 0.030]} />
            <MonogramDecal key={`${config.monogramPosition}-${config.collar}-${config.cuff}-${config.pocket}-${config.fabric?.colorMapUrl || ''}-${config.collarFabric?.colorMapUrl || ''}-${config.cuffFabric?.colorMapUrl || ''}-${config.pocketFabric?.colorMapUrl || ''}`} scene={clonedScene} config={config} />
        </group>
    );
}


// Screenshot Capture Component
const ScreenshotCapture = forwardRef((_, ref) => {
    const { gl, scene, camera } = useThree();

    useImperativeHandle(ref, () => ({
        capture: () => {
            gl.render(scene, camera);
            return gl.domElement.toDataURL('image/webp', 0.6);
        }
    }));

    return null;
});

export interface ProductPreview3DRef {
    capture: () => string;
}

// Key for fabric-related config changes (triggers soft transition)
function getFabricConfigKey(c: ThreeDConfig): string {
    return [
        c.fabric?.id ?? '',
        c.collar,
        c.cuff,
        c.pocket,
        c.collarFabric?.id ?? '',
        c.cuffFabric?.id ?? '',
        c.placketFabric?.id ?? '',
        c.pocketFabric?.id ?? '',
    ].join('|');
}

// Wrapper to handle useGLTF with custom extensions
function ModelLoader({ modelUrl, config, viewMode, onReady }: { modelUrl: string, config: ThreeDConfig, viewMode: 'front' | 'back', onReady: (ready: boolean) => void }) {
    const { gl } = useThree();

    const { scene } = useGLTF(modelUrl, undefined, undefined, (loader) => {
        ktx2Loader.detectSupport(gl);
        // @ts-ignore - Ignore type mismatch between three-stdlib's KTX2Loader and three's KTX2Loader. They are functionally identical but have slightly differing type definitions.
        loader.setKTX2Loader(ktx2Loader);
        loader.setMeshoptDecoder(MeshoptDecoder);
    });

    return <ModularModel3D scene={scene} config={config} viewMode={viewMode} onReady={onReady} />;
}

const ProductPreview3D = forwardRef<ProductPreview3DRef, ProductPreview3DProps>(({
    productType,
    config,
    viewMode,
    zoom = 4.5,
    onZoomIn,
    onZoomOut,
    onResetView,
    className,
    showControls = true,
    modelUrl,
    environmentUrl,
    onSceneReady,
}, ref) => {

    // Internal state for zoom if not provided
    const [internalZoom, setInternalZoom] = React.useState(zoom);
    const currentZoom = onZoomIn ? zoom : internalZoom;

    const handleZoomIn = onZoomIn || (() => setInternalZoom(z => Math.max(z - 0.5, 2)));
    const handleZoomOut = onZoomOut || (() => setInternalZoom(z => Math.min(z + 0.5, 8)));

    const orbitRef = useRef<any>(null);
    const handleResetView = () => {
        if (orbitRef.current) {
            orbitRef.current.reset();
        }
        if (onResetView) {
            onResetView();
        } else if (!onZoomIn) {
            setInternalZoom(zoom);
        }
    };

    const internalScreenshotRef = useRef<any>(null);
    const [showFirstLoadLoader, setShowFirstLoadLoader] = useState(true);

    const [isModelReady, setIsModelReady] = useState(false);

    // Soft white flash transition when fabric combinations change (not heartbeat-like)
    const [flashOpacity, setFlashOpacity] = React.useState(0);
    const prevFabricKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const fabricKey = getFabricConfigKey(config);
        if (prevFabricKeyRef.current !== null && prevFabricKeyRef.current !== fabricKey) {
            setFlashOpacity(0.45);
            // Reset ready state on config change to show flash / delay interactions if needed
            // setIsModelReady(false); // Enable this if we want loader on every fabric change
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setFlashOpacity(0);
                });
            });
        }
        prevFabricKeyRef.current = fabricKey;
    }, [config]);

    useImperativeHandle(ref, () => ({
        capture: () => {
            if (internalScreenshotRef.current) {
                return internalScreenshotRef.current.capture();
            }
            return '';
        }
    }));

    // Guard: if no Cloudinary URLs are provided, show a graceful error instead of loading from local /public
    if (!modelUrl) {
        return (
            <div className={`relative h-full w-full flex items-center justify-center ${className}`}>
                <div className="text-center p-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3 mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading 3D model...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative h-full w-full ${className}`}>
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* In-Canvas Loader Overlay - blocks the untextured model until textures fully load */}
            {showFirstLoadLoader && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-300">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading Custom Fabric...</span>
                </div>
            )}

            <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 32 }} style={{ height: '100%', width: '100%' }} gl={{
                preserveDrawingBuffer: true, alpha: true,
                antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2
            }} shadows>
                <Suspense fallback={<Html center />}>
                    <ModelLoader
                        modelUrl={modelUrl}
                        config={config}
                        viewMode={viewMode}
                        onReady={(ready) => {
                            setIsModelReady(ready);
                            if (ready) {
                                setShowFirstLoadLoader(false);
                                if (onSceneReady) onSceneReady();
                            }
                        }}
                    />
                    <CameraController zoom={currentZoom} />
                    {environmentUrl && <Environment files={environmentUrl} background={false} environmentIntensity={0.3} />}

                    <ambientLight intensity={0.5} />
                    {/* Key Light (Front) - Baked shadow focus directly into light props so shadow map 2048x2048 is crisp, preventing acne while rescuing collar shadows */}
                    <directionalLight
                        position={[5, 10, 5]}
                        intensity={1.5}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                        // shadow-bias={-0.0001}
                        shadow-normalBias={0.001}
                        shadow-camera-left={-2}
                        shadow-camera-right={2}
                        shadow-camera-top={2}
                        shadow-camera-bottom={-2}
                        shadow-camera-near={0.1}
                        shadow-camera-far={20}
                    />
                    {/* Fill Light (Back) - Low intensity just to fill in pitch-black shadows from the rear */}
                    <directionalLight position={[-5, 5, -5]} intensity={1.6} castShadow={false} />

                    <ScreenshotCapture ref={internalScreenshotRef} />

                    <ContactShadows position={[0, -1.3, 0]} opacity={0.4} scale={10} blur={2.5} far={4} frames={1} />
                </Suspense>
                <OrbitControls
                    ref={orbitRef}
                    enablePan={true}
                    enableZoom={false}
                    enableRotate={true}
                    enableDamping={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.6}
                    makeDefault
                />
            </Canvas>

            {/* Soft white flash overlay when fabric changes - smooth fade, not heartbeat-like */}
            <div
                className="absolute inset-0 bg-white pointer-events-none z-10 rounded-xl transition-opacity duration-300 ease-out"
                style={{ opacity: flashOpacity }}
                aria-hidden
            />

            {/* Zoom & View Controls */}
            {showControls && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm z-10 transition-transform">
                    <button onClick={handleZoomOut} className="p-1 hover:bg-muted rounded transition-colors" aria-label="Zoom out">
                        <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
                    </button>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Drag to move</span>
                    <button onClick={handleZoomIn} className="p-1 hover:bg-muted rounded transition-colors" aria-label="Zoom in">
                        <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <button onClick={handleResetView} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground" aria-label="Reset View" title="Reset View">
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                </div>
            )}
        </div>
    );
});

export default ProductPreview3D;
