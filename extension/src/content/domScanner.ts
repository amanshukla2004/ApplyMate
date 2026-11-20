import { DetectedField, FieldStatus, SelectOption } from '../types/messaging';
import { LabelExtractor } from './labelExtractor';
import { FieldMatcher } from './fieldMatcher';

export class DOMScanner {
  // Local registry keeping actual HTMLElement references by stable field ID
  private elementRegistry = new Map<string, HTMLElement>();
  private counter = 0;

  getElement(fieldId: string): HTMLElement | undefined {
    return this.elementRegistry.get(fieldId);
  }

  registerElement(el: HTMLElement, customFieldId?: string): string {
    this.counter++;
    const fieldId = customFieldId || `jm-field-${this.counter}`;
    this.elementRegistry.set(fieldId, el);
    return fieldId;
  }

  scan(): DetectedField[] {
    this.elementRegistry.clear();
    this.counter = 0;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
      )
    );

    const detectedFields: DetectedField[] = [];

    for (const el of elements) {
      if (this.shouldSkipElement(el)) {
        continue;
      }

      this.counter++;
      const fieldId = `jm-field-${this.counter}`;
      this.elementRegistry.set(fieldId, el);

      const tagName = el.tagName.toUpperCase();
      const fieldType = (el.getAttribute('type') || (tagName === 'TEXTAREA' ? 'textarea' : 'text')).toLowerCase();
      const name = el.getAttribute('name') || '';
      const elementId = el.getAttribute('id') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const autocomplete = el.getAttribute('autocomplete') || '';
      const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

      const label = LabelExtractor.extractLabel(el);

      // Extract options if SELECT
      let options: SelectOption[] | undefined = undefined;
      if (tagName === 'SELECT') {
        const selectEl = el as HTMLSelectElement;
        options = Array.from(selectEl.options).map((opt) => ({
          label: opt.text.trim(),
          value: opt.value.trim(),
        }));
      }

      // Check canonical match
      const match = FieldMatcher.match(name, elementId, label, placeholder, autocomplete, ariaLabel);

      let status: FieldStatus = 'UNMATCHED';
      if (match.canonicalField) {
        status = match.confidence >= 0.75 ? 'MATCHED' : 'NEEDS_REVIEW';
      }

      detectedFields.push({
        id: fieldId,
        tagName,
        fieldType,
        name: name || undefined,
        elementId: elementId || undefined,
        label: label || name || elementId || `Field #${this.counter}`,
        placeholder: placeholder || undefined,
        ariaLabel: ariaLabel || undefined,
        autocomplete: autocomplete || undefined,
        required,
        options,
        canonicalField: match.canonicalField,
        confidence: Math.round(match.confidence * 100) / 100,
        status,
      });
    }

    return detectedFields;
  }

  private shouldSkipElement(el: HTMLElement): boolean {
    // Skip if explicitly hidden
    if (el.hidden || el.style.display === 'none' || el.style.visibility === 'hidden') {
      return true;
    }

    if (typeof window !== 'undefined' && 'getComputedStyle' in window) {
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return true;
        }
      } catch {
        // Fallback if computed style fails
      }
    }

    // Skip csrf/security token fields and container token inputs
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.getAttribute('id') || '').toLowerCase();
    if (
      name.includes('csrf') ||
      id.includes('csrf') ||
      name.includes('authenticity_token') ||
      name.includes('captcha') ||
      name.includes('primary questionnaire') ||
      id.includes('primary questionnaire')
    ) {
      return true;
    }

    // Skip search bar inputs
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'search' || name.includes('search') || id.includes('search')) {
      return true;
    }

    return false;
  }
}

export const domScanner = new DOMScanner();
