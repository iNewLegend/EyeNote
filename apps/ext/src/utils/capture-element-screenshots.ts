import type { ElementScreenshot } from "@eye-note/definitions";

export type { ElementScreenshot };

interface CaptureOptions {
    element: Element;
    markerElement?: HTMLElement | null;
    padding?: number;
    zoomLevels?: number[];
    onProgress?: ( current: number, total: number, zoom: number ) => void;
}

export async function captureElementScreenshots( {
    element,
    markerElement,
    padding = 20,
    zoomLevels = [ 1, 2 ],
    onProgress,
}: CaptureOptions ): Promise<ElementScreenshot[]> {
    const html2canvas = await import( "html2canvas" );
    
    const blockerElement = document.getElementById( "eye-note-interaction-blocker" );
    const originalBlockerDisplay = blockerElement?.style.display;
    
    if ( blockerElement ) {
        blockerElement.style.display = "none";
    }
    
    await new Promise( ( resolve ) => requestAnimationFrame( () => requestAnimationFrame( resolve ) ) );
    
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const screenshots: ElementScreenshot[] = [];
    
    try {
        for ( let i = 0; i < zoomLevels.length; i++ ) {
            const zoom = zoomLevels[ i ];
            
            if ( i > 0 ) {
                await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );
            }
            
            await new Promise( ( resolve ) => requestAnimationFrame( resolve ) );
            
            try {
                const zoomPadding = padding * zoom;
                const elementLeft = rect.left + scrollX;
                const elementTop = rect.top + scrollY;
                const captureX = Math.max( 0, elementLeft - zoomPadding );
                const captureY = Math.max( 0, elementTop - zoomPadding );
                const captureWidth = Math.min( 
                    document.documentElement.scrollWidth - captureX, 
                    rect.width + zoomPadding * 2 
                );
                const captureHeight = Math.min( 
                    document.documentElement.scrollHeight - captureY, 
                    rect.height + zoomPadding * 2 
                );

                await new Promise( ( resolve ) => setTimeout( resolve, 100 ) );

                if ( onProgress ) {
                    onProgress( i + 1, zoomLevels.length, zoom );
                }

                await new Promise( ( resolve ) => requestAnimationFrame( resolve ) );

                const canvas = await html2canvas.default( document.body, {
                    x: captureX,
                    y: captureY,
                    width: captureWidth,
                    height: captureHeight,
                    scale: zoom,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    logging: false,
                    ignoreElements: ( el ) => {
                        if ( !el ) return false;
                        const isOverlay = el.classList?.contains( "notes-plugin" ) || 
                                         el.id === "eye-note-interaction-blocker";
                        return Boolean( isOverlay );
                    },
                } );

                await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );

                const maxWidth = 1920;
                const maxHeight = 1080;
                let finalCanvas = canvas;

                if ( canvas.width > maxWidth || canvas.height > maxHeight ) {
                    const ratio = Math.min( maxWidth / canvas.width, maxHeight / canvas.height );
                    const scaledWidth = Math.floor( canvas.width * ratio );
                    const scaledHeight = Math.floor( canvas.height * ratio );
                    
                    finalCanvas = document.createElement( "canvas" );
                    finalCanvas.width = scaledWidth;
                    finalCanvas.height = scaledHeight;
                    const ctx = finalCanvas.getContext( "2d" );
                    if ( ctx ) {
                        ctx.drawImage( canvas, 0, 0, scaledWidth, scaledHeight );
                    }
                }

                const dataUrl = finalCanvas.toDataURL( "image/jpeg", 0.85 );
                
                screenshots.push( {
                    dataUrl,
                    width: finalCanvas.width,
                    height: finalCanvas.height,
                    zoom,
                } );
                
                await new Promise( ( resolve ) => setTimeout( resolve, 100 ) );
            } catch ( error ) {
                console.warn( `[EyeNote] Failed to capture screenshot at zoom ${zoom}:`, error );
            }
        }
    } finally {
        if ( blockerElement ) {
            if ( originalBlockerDisplay ) {
                blockerElement.style.display = originalBlockerDisplay;
            } else {
                blockerElement.style.removeProperty( "display" );
            }
        }
    }
    
    return screenshots;
}

