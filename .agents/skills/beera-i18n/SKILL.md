---
name: beera-i18n
description: Use this skill when you need to add, modify, or debug localization/translations (Hebrew/English) in the Beera app (e.g. updating i18n.ts or adjusting RTL layouts).
---

# Beera Internationalization (i18n) & Localization Skill

This skill outlines guidelines for managing translations and layout rendering for the bilingual (English and Hebrew) Beera application.

## Translations Schema

All translation definitions reside in [i18n.ts](file:///Users/david/Documents/dev-projects/beera/src/i18n.ts).
* Translation records are grouped under the `translations` object for the `Language` keys: `'en'` and `'he'`.
* Translation helper function `t(key: string): string` retrieves the translation string for the active language set in `store.getState().language`.

### Key Synchronicity Requirement
* **Mandatory Rule**: Whenever a translation key is added, modified, or deleted in the `'en'` record, you **must** apply the corresponding change to the `'he'` record.
* Maintain matching namespaces:
  * `nav.*` for Navigation & layout headers.
  * `project.*` for Project modal, actions, and empty states.
  * `column.*` for Kanban board column names.
  * `priority.*` for Task priority labels.
  * `task.modal.*` for Task detail modal contents.
  * `dash.*` for Dashboard chart metrics, legends, and analytics titles.

---

## RTL (Right-to-Left) Styling Guidelines

Hebrew (`he`) is a right-to-left language. The layout must adapt dynamically when the language switches.

### DOM Updates
* Ensure the `dir` attribute on the root or container element is updated when the language changes. For example:
  ```typescript
  document.documentElement.dir = state.language === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = state.language;
  ```

### CSS Considerations
* When styling margins, paddings, and borders, use modern CSS Logical Properties where possible (e.g., `margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`).
* If using standard absolute directions in [style.css](file:///Users/david/Documents/dev-projects/beera/src/style.css), write override selectors prefixed by `[dir="rtl"]` or `html[lang="he"]`.
  ```css
  /* Example absolute positioning override */
  .close-btn {
    right: 16px;
  }
  [dir="rtl"] .close-btn {
    right: auto;
    left: 16px;
  }
  ```

### Visual Assets & Icons
* Be careful with directional icons (such as arrows, back/forward buttons, chevrons). In Hebrew layout, back/forward directions are visually flipped. Ensure icon selection updates appropriately based on the active language.
