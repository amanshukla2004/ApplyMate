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

      // Extract options if SELECT or combobox
      let options: SelectOption[] | undefined = undefined;
      let effectiveFieldType = fieldType;

      if (tagName === 'SELECT') {
        const selectEl = el as HTMLSelectElement;
        const rawOpts = Array.from(selectEl.options).map((opt) => ({
          label: opt.text.trim(),
          value: opt.value.trim(),
        }));
        // Filter out empty placeholder options like "Select...", "-- Select --", etc.
        const filtered = rawOpts.filter((opt) => opt.value !== '' && !LabelExtractor.isInvalidPlaceholder(opt.label));
        options = filtered.length > 0 ? filtered : rawOpts;
        effectiveFieldType = 'select';
      } else if (tagName === 'INPUT') {
        // Check if there is an associated select in the same field container
        const selectContainer = el.closest('.field, [class*="field"], .select-wrapper, [class*="select"], .form-group');
        const siblingSelect = selectContainer?.querySelector('select');
        if (siblingSelect && siblingSelect !== el && siblingSelect.options.length > 0) {
          // If this is a visible phone / mobile input alongside a separate prefix or country select,
          // do NOT convert the text input into a select! Keep it as its native input type.
          const isPhoneOrMultiInput =
            fieldType === 'tel' ||
            name.toLowerCase().includes('phone') ||
            elementId.toLowerCase().includes('phone') ||
            (siblingSelect.offsetParent !== null && siblingSelect.style.display !== 'none');

          if (!isPhoneOrMultiInput) {
            const rawOpts = Array.from(siblingSelect.options).map((opt) => ({
              label: opt.text.trim(),
              value: opt.value.trim(),
            }));
            const filtered = rawOpts.filter((opt) => opt.value !== '' && !LabelExtractor.isInvalidPlaceholder(opt.label));
            options = filtered.length > 0 ? filtered : rawOpts;
            effectiveFieldType = 'select';
          }
        }
      }

      // Fallback clean label
      let finalLabel = label;
      if (!finalLabel || LabelExtractor.isInvalidPlaceholder(finalLabel)) {
        if (name && !LabelExtractor.isInvalidPlaceholder(name)) {
          const candidate = LabelExtractor.cleanLabel(LabelExtractor.formatIdentifier(name));
          finalLabel = !LabelExtractor.isInvalidPlaceholder(candidate) ? candidate : `Field #${this.counter}`;
        } else if (elementId && !LabelExtractor.isInvalidPlaceholder(elementId)) {
          const candidate = LabelExtractor.cleanLabel(LabelExtractor.formatIdentifier(elementId));
          finalLabel = !LabelExtractor.isInvalidPlaceholder(candidate) ? candidate : `Field #${this.counter}`;
        } else {
          finalLabel = `Field #${this.counter}`;
        }
      }

      // Check canonical match
      const match = FieldMatcher.match(name, elementId, finalLabel, placeholder, autocomplete, ariaLabel);

      let status: FieldStatus = 'UNMATCHED';
      if (match.canonicalField) {
        status = match.confidence >= 0.75 ? 'MATCHED' : 'NEEDS_REVIEW';
      }

      detectedFields.push({
        id: fieldId,
        tagName,
        fieldType: effectiveFieldType,
        name: name || undefined,
        elementId: elementId || undefined,
        label: finalLabel,
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

    // Skip helper/cloned search inputs in custom dropdowns (e.g. Zoho Lyte country search, Choices.js)
    const className = (el.getAttribute('class') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    if (
      className.includes('choices__input--cloned') ||
      className.includes('select__input') ||
      className.includes('lytesearchinput') ||
      placeholder.includes('search country with dial code') ||
      el.closest('lyte-search, lyte-drop-box, .zrc-cc-dropbox, [is-search="true"]') !== null ||
      (el.tagName === 'INPUT' && (className.includes('choices__input') || className.includes('custom-select-search')))
    ) {
      return true;
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
