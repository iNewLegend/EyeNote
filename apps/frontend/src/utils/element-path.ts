export function getElementPath(element: Element): string {
  const path: string[] = [];
  let currentElement: Element | null = element;

  while (currentElement && currentElement !== document.body) {
    let selector = currentElement.tagName.toLowerCase();

    if (currentElement.id) {
      selector += `#${currentElement.id}`;
    } else {
      const siblings = Array.from(currentElement.parentElement?.children || []);
      const sameTagSiblings = siblings.filter(
        (el) => el.tagName === currentElement?.tagName
      );
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(currentElement);
        selector += `:nth-of-type(${index + 1})`;
      }
    }

    path.unshift(selector);
    currentElement = currentElement.parentElement;
  }

  return path.join(" > ");
}

export function findElementByPath(path: string): Element | null {
  try {
    return document.querySelector(path);
  } catch {
    console.error("Invalid element path:", path);
    return null;
  }
}
