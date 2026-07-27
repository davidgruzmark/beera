# Beera Coding Rules & Guidelines

Welcome to the **Beera** project! This document outlines style guidelines, architecture standards, and development workflows to optimize how Antigravity operates on this codebase.

## Tech Stack
* **Build Tool**: Vite (configured in [package.json](file:///Users/david/Documents/dev-projects/beera/package.json))
* **Language**: TypeScript (`~5.6.2`)
* **Styling**: Vanilla CSS (defined in [style.css](file:///Users/david/Documents/dev-projects/beera/src/style.css))
* **Containerization**: Multi-stage Docker build served via Nginx (see [Dockerfile](file:///Users/david/Documents/dev-projects/beera/Dockerfile) and [nginx.conf](file:///Users/david/Documents/dev-projects/beera/nginx.conf))

---

## Component Architecture

Beera uses a vanilla TypeScript component system. Do not introduce frontend frameworks (like React, Vue, or Angular) unless explicitly requested.

### Component Structure
Each component in `src/components/` must implement a standard life-cycle:
1. **Mounting**: A `mount(parent: HTMLElement)` method that appends/inserts the component HTML to the parent element, registers event listeners, and hooks up store subscriptions.
2. **Unmounting**: An `unmount()` method that removes event listeners, unsubscribes from the store, and clears the reference pointers. **This is critical to prevent memory leaks.**

Example pattern:
```typescript
import { store } from '../store';

export class MyComponent {
  private parentElement: HTMLElement | null = null;
  private container: HTMLDivElement | null = null;
  private unsubscribe: (() => void) | null = null;

  public mount(parent: HTMLElement) {
    this.parentElement = parent;
    this.container = document.createElement('div');
    this.container.className = 'my-component';
    
    // Initial Render
    this.render();
    this.parentElement.appendChild(this.container);

    // Event Listeners
    this.container.querySelector('.btn-action')?.addEventListener('click', this.handleAction);

    // State Subscription
    this.unsubscribe = store.subscribe((state) => {
      this.update(state);
    });
  }

  public unmount() {
    // Unsubscribe from store to prevent memory leaks
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clean up event listeners and DOM elements
    if (this.container) {
      this.container.querySelector('.btn-action')?.removeEventListener('click', this.handleAction);
      this.container.remove();
      this.container = null;
    }
    
    this.parentElement = null;
  }

  private render() {
    if (!this.container) return;
    this.container.innerHTML = `<button class="btn-action">Click Me</button>`;
  }

  private update(state: any) {
    // Handle view re-rendering / updating based on store changes
  }

  private handleAction = () => {
    // Perform state action
  };
}
```

---

## State Management

All application state is centralized in [store.ts](file:///Users/david/Documents/dev-projects/beera/src/store.ts).
* Always import and use `store`.
* Use `store.getState()` to inspect current values.
* Use provided mutation methods on the `store` object to modify tasks, projects, language, theme, and views.
* Avoid direct mutations of the state object. All modifications should trigger subscribers automatically via `store.subscribe`.

---

## Styling & Theme System

* Do not use utility-first frameworks like Tailwind CSS.
* All styles must be defined inside [style.css](file:///Users/david/Documents/dev-projects/beera/src/style.css).
* Use CSS variables defined in `:root` (and overridden in `.dark-theme`) for colors, backgrounds, borders, and shadows.
* Make sure components use the correct variables to maintain full light/dark mode compatibility.

---

## Localization (i18n)

Beera supports English (`en`) and Hebrew (`he`).
* Whenever adding or changing text labels, you **must** update [i18n.ts](file:///Users/david/Documents/dev-projects/beera/src/i18n.ts).
* Ensure every translation key exists in both the `en` and `he` records.
* For RTL (Right-to-Left) rendering, Hebrew elements should respect layout changes. Check translation helper functions and class names.
