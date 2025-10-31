import type { ElementScreenshot } from "@eye-note/definitions";

export type { ElementScreenshot };

interface CaptureOptions {
    element: Element;
    markerElement?: HTMLElement | null;
    padding?: number;
    zoomLevels?: number[];
}

export async function captureElementScreenshots( {
    element,
    markerElement,
    padding = 20,
    zoomLevels = [ 1, 1.5, 2 ],
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

                await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

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

                await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

                const dataUrl = canvas.toDataURL( "image/png", 1.0 );
                
                screenshots.push( {
                    dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    zoom,
                } );
                
                await new Promise( ( resolve ) => requestAnimationFrame( resolve ) );
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

