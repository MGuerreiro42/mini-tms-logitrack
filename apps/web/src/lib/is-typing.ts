// Single-key shortcuts must not fire while the user is typing in a field.
export const isTyping = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));
