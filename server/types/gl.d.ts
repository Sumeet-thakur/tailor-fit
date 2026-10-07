// Type declarations for headless-gl package
declare module 'gl' {
    function createContext(
        width: number,
        height: number,
        options?: Record<string, unknown>
    ): WebGLRenderingContext;
    export default createContext;
}
