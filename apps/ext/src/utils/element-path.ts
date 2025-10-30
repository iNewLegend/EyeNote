export function getElementPath ( element : Element ) : string {
    const segments : string[] = [];
    let current : Element | null = element;

    while ( current && current !== document.documentElement ) {
        const tagName = current.tagName.toLowerCase();
        const parentElement : Element | null = current.parentElement;

        let segment = tagName;

        if ( parentElement ) {
            const siblings = Array.from( parentElement.children ) as Element[];
            const sameTagSiblings = siblings.filter(
                ( sibling ) => sibling.tagName === current!.tagName
            );
            if ( sameTagSiblings.length > 1 ) {
                const index = sameTagSiblings.indexOf( current );
                segment += `:nth-of-type(${ index + 1 })`;
            }
        }

        segments.unshift( segment );
        current = parentElement;
    }

    return segments.join( " > " );
}

export function findElementByPath ( path : string ) : Element | null {
    try {
        return document.querySelector( path );
    } catch {
        console.error( "Invalid element path:", path );
        return null;
    }
}
