declare module "html2canvas" {
    export interface Html2CanvasOptions {
        x ?: number;
        y ?: number;
        width ?: number;
        height ?: number;
        scale ?: number;
        useCORS ?: boolean;
        allowTaint ?: boolean;
        backgroundColor ?: string | null;
        logging ?: boolean;
        ignoreElements ?: ( element : Element ) => boolean;
        onclone ?: ( clonedDocument : Document ) => void;
    }

    export type Html2CanvasFn = (
        element : HTMLElement,
        options ?: Html2CanvasOptions
    ) => Promise<HTMLCanvasElement>;

    const html2canvas : Html2CanvasFn;
    export default html2canvas;
}
