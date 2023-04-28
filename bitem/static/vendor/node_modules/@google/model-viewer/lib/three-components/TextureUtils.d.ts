import { EventDispatcher, Texture, TextureLoader, WebGLRenderer } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
export interface EnvironmentMapAndSkybox {
    environmentMap: Texture;
    skybox: Texture | null;
}
export default class TextureUtils extends EventDispatcher {
    private threeRenderer;
    lottieLoaderUrl: string;
    withCredentials: boolean;
    private _ldrLoader;
    private _hdrLoader;
    private _lottieLoader;
    private generatedEnvironmentMap;
    private generatedEnvironmentMapAlt;
    private skyboxCache;
    private blurMaterial;
    private blurScene;
    constructor(threeRenderer: WebGLRenderer);
    get ldrLoader(): TextureLoader;
    get hdrLoader(): RGBELoader;
    getLottieLoader(): Promise<any>;
    loadImage(url: string): Promise<Texture>;
    loadLottie(url: string, quality: number): Promise<Texture>;
    loadEquirect(url: string, progressCallback?: (progress: number) => void): Promise<Texture>;
    /**
     * Returns a { skybox, environmentMap } object with the targets/textures
     * accordingly. `skybox` is a WebGLRenderCubeTarget, and `environmentMap`
     * is a Texture from a WebGLRenderCubeTarget.
     */
    generateEnvironmentMapAndSkybox(skyboxUrl?: string | null, environmentMapUrl?: string | null, progressCallback?: (progress: number) => void): Promise<EnvironmentMapAndSkybox>;
    /**
     * Loads an equirect Texture from a given URL, for use as a skybox.
     */
    private loadEquirectFromUrl;
    private GenerateEnvironmentMap;
    /**
     * Loads a dynamically generated environment map.
     */
    private loadGeneratedEnvironmentMap;
    /**
     * Loads a dynamically generated environment map, designed to be neutral and
     * color-preserving. Shows less contrast around the different sides of the
     * object.
     */
    private loadGeneratedEnvironmentMapAlt;
    private blurCubemap;
    private halfblur;
    private getBlurShader;
    dispose(): Promise<void>;
}
