// Inject styles directly to ensure they work
const styles = `
.eye-note-highlight {
  position: relative !important;
  outline: 3px solid #646cff !important;
  outline-offset: 2px !important;
  cursor: crosshair !important;
  background-color: rgba(100, 108, 255, 0.1) !important;
  transition: outline-color 0.2s ease, background-color 0.2s ease !important;
  z-index: 999999 !important;
}

.eye-note-highlight * {
  pointer-events: none !important;
}

.notes-plugin {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.note-marker {
  position: absolute;
  width: 24px;
  height: 24px;
  background-color: #646cff;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.note-marker:hover {
  transform: scale(1.1);
  background-color: #535bf2;
}

.note-content {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 300px;
  pointer-events: auto;
  z-index: 10000;
  max-height: 80vh;
  overflow-y: auto;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Create root element for notes
const root = document.createElement('div');
root.id = 'eye-note-root';
root.className = 'notes-plugin';
document.body.appendChild(root);

// State
const state = {
  isShiftPressed: false,
  hoveredElement: null,
  notes: []
};

// Helper function to get element path
function getElementPath(element) {
  const path = [];
  let currentElement = element;

  while (currentElement && currentElement !== document.body) {
    let selector = currentElement.tagName.toLowerCase();
    
    if (currentElement.id) {
      selector += `#${currentElement.id}`;
    } else {
      const siblings = Array.from(currentElement.parentElement?.children || []);
      const sameTagSiblings = siblings.filter(
        (el) => el.tagName === currentElement.tagName
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

// Handle shift key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') {
    state.isShiftPressed = true;
    document.body.style.cursor = 'crosshair';
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    state.isShiftPressed = false;
    if (state.hoveredElement) {
      state.hoveredElement.classList.remove('eye-note-highlight');
    }
    state.hoveredElement = null;
    document.body.style.cursor = '';
  }
});

// Handle mouse events
document.addEventListener('mouseover', (e) => {
  if (!state.isShiftPressed) return;
  
  e.stopPropagation();
  const target = e.target;
  
  // Don't highlight if it's the same element
  if (target === state.hoveredElement) return;
  
  // Remove highlight from previous element
  if (state.hoveredElement) {
    state.hoveredElement.classList.remove('eye-note-highlight');
  }

  // Don't highlight our own UI elements
  if (target.closest('.notes-plugin')) return;
  if (target.classList.contains('eye-note-highlight')) return;

  // Add highlight to new element
  requestAnimationFrame(() => {
    target.classList.add('eye-note-highlight');
    state.hoveredElement = target;
  });
});

document.addEventListener('mouseout', (e) => {
  if (!state.isShiftPressed) return;
  
  const target = e.target;
  if (target === state.hoveredElement) {
    target.classList.remove('eye-note-highlight');
    state.hoveredElement = null;
  }
});

// Handle clicks for note creation
document.addEventListener('click', (e) => {
  if (!state.isShiftPressed || !state.hoveredElement) return;

  e.preventDefault();
  e.stopPropagation();

  const rect = state.hoveredElement.getBoundingClientRect();
  const note = {
    id: Date.now(),
    elementPath: getElementPath(state.hoveredElement),
    content: '',
    url: window.location.href,
    x: rect.right,
    y: rect.top,
    isEditing: true
  };

  state.notes.push(note);
  renderNotes();
});

// Render notes
function renderNotes() {
  root.innerHTML = '';
  
  state.notes.forEach(note => {
    // Create note marker
    const marker = document.createElement('div');
    marker.className = 'note-marker';
    marker.style.left = `${note.x}px`;
    marker.style.top = `${note.y}px`;
    
    // Create note content if editing
    if (note.isEditing) {
      const content = document.createElement('div');
      content.className = 'note-content';
      content.style.left = `${note.x}px`;
      content.style.top = `${note.y + 20}px`;
      
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Enter your note...';
      textarea.value = note.content;
      textarea.addEventListener('blur', (e) => {
        note.content = e.target.value;
        note.isEditing = false;
        renderNotes();
      });
      
      content.appendChild(textarea);
      root.appendChild(content);
    }
    
    root.appendChild(marker);
  });
}

// Cleanup on extension unload
window.addEventListener('unload', () => {
  styleSheet.remove();
  root.remove();
}); 