export class LabelExtractor {
  /**
   * Extracts the most accurate human-readable label for a given form element.
   */
  static extractLabel(element: HTMLElement): string {
    // 1. Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return this.cleanLabel(ariaLabel);
    }

    // 2. Check aria-labelledby (handles single ID or multiple space-separated IDs like in Google Forms)
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
      const parts = ids
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        return this.cleanLabel(parts.join(' '));
      }
    }

    // 2b. Check Google Forms and ATS question container (role="listitem" or .Qr7Oae)
    const formItem = element.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer');
    if (formItem) {
      const heading = formItem.querySelector('[role="heading"], .M7eMe, .HoGqGc');
      if (heading && heading.textContent && heading.textContent.trim()) {
        return this.cleanLabel(heading.textContent);
      }
    }

    // 3. Check <label for="elementId">
    if (element.id) {
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(element.id) : element.id.replace(/["\\]/g, '\\$&');
      const explicitLabel = document.querySelector(`label[for="${escapedId}"]`);
      if (explicitLabel && explicitLabel.textContent) {
        return this.cleanLabel(explicitLabel.textContent);
      }
    }

    // 4. Check enclosing <label> element
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Clone label to remove input text itself if present
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach((inp) => inp.remove());
      if (clone.textContent && clone.textContent.trim()) {
        return this.cleanLabel(clone.textContent);
      }
    }

    // 5. Check placeholder attribute
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return this.cleanLabel(placeholder);
    }

    // 6. Check preceding sibling or nearby container label / text
    const previousSibling = element.previousElementSibling;
    if (previousSibling && (previousSibling.tagName === 'LABEL' || previousSibling.tagName === 'SPAN' || previousSibling.tagName === 'DIV')) {
      if (previousSibling.textContent && previousSibling.textContent.trim().length < 80) {
        return this.cleanLabel(previousSibling.textContent);
      }
    }

    // 7. Check parent container text header (e.g. form-group label)
    const parent = element.parentElement;
    if (parent) {
      const labelChild = parent.querySelector('label, .label, .field-label, [data-automation-id*="label"]');
      if (labelChild && labelChild.textContent && labelChild.textContent.trim().length < 80) {
        return this.cleanLabel(labelChild.textContent);
      }
    }

    // 8. Fallback to name or id attribute
    const name = element.getAttribute('name');
    if (name) {
      return this.formatIdentifier(name);
    }

    const id = element.getAttribute('id');
    if (id) {
      return this.formatIdentifier(id);
    }

    return '';
  }

  static cleanLabel(raw: string): string {
    return raw
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s*\*+\s*$/, '') // remove trailing required asterisk
      .replace(/\s*:\s*$/, '') // remove trailing colon
      .replace(/\(optional\)/gi, '')
      .replace(/\(required\)/gi, '')
      .trim();
  }

  private static formatIdentifier(identifier: string): string {
    return identifier
      .replace(/[-_.]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .trim();
  }
}
