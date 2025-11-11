import { Button, Dialog, DialogContent } from "@eye-note/ui";

import type { Note } from "@eye-note/ext/src/types";

type NoteScreenshot = NonNullable<Note["screenshots"]>[ number ];

interface NoteImageViewerProps {
    open : boolean;
    container : HTMLElement | null;
    screenshot : NoteScreenshot | null;
    hasMultipleScreenshots : boolean;
    currentIndex : number | null;
    totalScreenshots : number;
    onClose : () => void;
    onPrevious : () => void;
    onNext : () => void;
}

export function NoteImageViewer ( {
    open,
    container,
    screenshot,
    hasMultipleScreenshots,
    currentIndex,
    totalScreenshots,
    onClose,
    onPrevious,
    onNext,
} : NoteImageViewerProps ) {
    const positionLabel = currentIndex !== null ? `${ currentIndex + 1 } / ${ totalScreenshots }` : null;

    return (
        <Dialog
            open={ open }
            onOpenChange={ ( nextOpen ) => {
                if ( !nextOpen ) {
                    onClose();
                }
            } }
        >
            <DialogContent
                { ...( container ? { container } : {} ) }
                className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none"
                onPointerDownOutside={ onClose }
            >
                { screenshot && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={ screenshot.dataUrl }
                            alt={ `Element capture at ${ screenshot.zoom }x zoom` }
                            className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-md backdrop-blur-sm">
                            <span className="font-medium">{ `${ screenshot.zoom }x zoom` }</span>
                            { hasMultipleScreenshots && positionLabel ? (
                                <span className="ml-2 text-muted-foreground">{ positionLabel }</span>
                            ) : null }
                        </div>
                        { hasMultipleScreenshots ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                                    onClick={ onPrevious }
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                                    onClick={ onNext }
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </Button>
                            </>
                        ) : null }
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                            onClick={ onClose }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>
                ) }
            </DialogContent>
        </Dialog>
    );
}
