import { FillResult } from '../types/messaging';
import { domScanner } from './domScanner';

export class AutofillEngine {
  async fillField(fieldId: string, value: string): Promise<FillResult> {
    const el = domScanner.getElement(fieldId);
    if (!el) {
      return {
        fieldId,
        success: false,
        message: 'Element reference not found in current DOM registry',
        errorCode: 'ELEMENT_NOT_FOUND',
      };
    }

    if (!document.body.contains(el)) {
      return {
        fieldId,
        success: false,
        message: 'Element was detached from the DOM',
        errorCode: 'ELEMENT_DETACHED',
      };
    }

    try {
      const tagName = el.tagName.toUpperCase();
      const type = (el.getAttribute('type') || '').toLowerCase();

      if (tagName === 'SELECT') {
        this.fillSelect(el as HTMLSelectElement, value);
      } else if (type === 'checkbox') {
        this.fillCheckbox(el as HTMLInputElement, value);
      } else if (type === 'radio') {
        this.fillRadio(el as HTMLInputElement, value);
      } else if (type === 'file') {
        // Direct silent file upload is prohibited by browser security
        return {
          fieldId,
          success: false,
          message: 'Resume upload requires user interaction via file selector',
          errorCode: 'FILE_INPUT_SECURITY_RESTRICTION',
        };
      } else {
        // Standard text, email, tel, url, number, textarea
        this.fillTextInput(el as HTMLInputElement | HTMLTextAreaElement, value);
      }

      this.highlightElement(el);

      return {
        fieldId,
        success: true,
        message: 'Field successfully populated',
      };
    } catch (err) {
      return {
        fieldId,
        success: false,
        message: (err as Error).message || 'Failed to fill field',
        errorCode: 'FILL_ERROR',
      };
    }
  }

  async fillMultiple(values: Record<string, string>): Promise<FillResult[]> {
    const results: FillResult[] = [];
    for (const [fieldId, val] of Object.entries(values)) {
      if (val !== undefined && val !== null) {
        const res = await this.fillField(fieldId, String(val));
        results.push(res);
      }
    }
    return results;
  }

  private fillTextInput(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    el.focus();

    // Use native prototype value setter to support React and other controlled components
    const proto = el.tagName.toUpperCase() === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }

    // Dispatch input and change events with bubbling
    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
  }

  private fillSelect(select: HTMLSelectElement, targetValue: string): void {
    const normTarget = targetValue.toLowerCase().trim();
    let matchedIndex = -1;

    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      const optVal = opt.value.toLowerCase().trim();
      const optText = opt.text.toLowerCase().trim();

      if (optVal === normTarget || optText === normTarget) {
        matchedIndex = i;
        break;
      }
      if (optText.includes(normTarget) || normTarget.includes(optText)) {
        if (matchedIndex === -1) matchedIndex = i;
      }
    }

    if (matchedIndex !== -1) {
      select.selectedIndex = matchedIndex;
      select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
  }

  private fillCheckbox(input: HTMLInputElement, value: string): void {
    const shouldCheck = ['true', 'yes', '1', 'on'].includes(value.toLowerCase().trim());
    if (input.checked !== shouldCheck) {
      input.click();
    }
  }

  private fillRadio(input: HTMLInputElement, value: string): void {
    const normVal = value.toLowerCase().trim();
    const radioVal = input.value.toLowerCase().trim();
    if (radioVal === normVal || normVal === 'yes') {
      input.click();
    }
  }

  private highlightElement(el: HTMLElement): void {
    const originalBorder = el.style.border;
    const originalTransition = el.style.transition;

    el.style.transition = 'all 0.3s ease';
    el.style.border = '2px solid #6366f1';
    el.style.backgroundColor = '#eef2ff';

    setTimeout(() => {
      el.style.border = originalBorder;
      el.style.backgroundColor = '';
      el.style.transition = originalTransition;
    }, 1500);
  }
}

export const autofillEngine = new AutofillEngine();
