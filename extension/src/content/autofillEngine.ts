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
    let finalValue = value;

    // Intelligent phone number formatting:
    // If filling a phone/mobile input and there is an attached/sibling country code select or flag picker,
    // strip the leading +91 / country code so only the 10-digit national number is entered
    const isPhoneInput =
      el.getAttribute('type') === 'tel' ||
      el.name.toLowerCase().includes('phone') ||
      el.name.toLowerCase().includes('mobile') ||
      el.id.toLowerCase().includes('phone') ||
      el.id.toLowerCase().includes('mobile') ||
      el.closest('[class*="phone"], [class*="mobile"], [class*="tel"]') !== null;

    if (isPhoneInput && /^\+?\d{10,15}$/.test(finalValue.replace(/[\s-]/g, ''))) {
      const container = el.closest('.field, [class*="field"], .form-group, .input-group, [class*="input"], [class*="group"], [class*="row"]');
      const hasCountrySelect = container?.querySelector('select, [class*="country"], [class*="dial"], [class*="flag"]');
      if (hasCountrySelect) {
        const digits = finalValue.replace(/\D/g, '');
        if (digits.length > 10 && digits.startsWith('91')) {
          finalValue = digits.slice(2);
        } else if (digits.length === 10) {
          finalValue = digits;
        }
      }
    }

    el.focus();

    // Use native prototype value setter to support React and other controlled components
    const proto = el.tagName.toUpperCase() === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor && descriptor.set) {
      descriptor.set.call(el, finalValue);
    } else {
      el.value = finalValue;
    }

    // Dispatch input and change events with bubbling and composed for Web Components (Lyte, Crux, Shadow DOM)
    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true, composed: true }));

    // Support Zoho Recruit Lyte custom component reactivity
    const lyteInput = el.closest('lyte-input') as any;
    if (lyteInput) {
      if (typeof lyteInput.setAttribute === 'function') {
        lyteInput.setAttribute('lt-prop-value', finalValue);
      }
      if (lyteInput.component && typeof lyteInput.component.setData === 'function') {
        try {
          lyteInput.component.setData('ltPropValue', finalValue);
        } catch {
          // ignore if internal lyte API differs
        }
      }
    }
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
      // Boolean Yes/No matching to 1/0/true/false
      if (
        (normTarget === 'yes' && (optVal === '1' || optVal === 'true' || optText === 'yes')) ||
        (normTarget === 'no' && (optVal === '0' || optVal === 'false' || optText === 'no'))
      ) {
        matchedIndex = i;
        break;
      }
      // Month numeric to name mapping (e.g. 06 / 6 <-> june)
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const targetNum = parseInt(normTarget, 10);
      if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= 12) {
        const mName = months[targetNum - 1];
        if (optText.includes(mName) || optVal === String(targetNum) || optVal === String(targetNum).padStart(2, '0')) {
          matchedIndex = i;
          break;
        }
      }
      if (optText.includes(normTarget) || normTarget.includes(optText)) {
        if (matchedIndex === -1) matchedIndex = i;
      }
    }

    // Phone Country Code (+91 / India / IN / 91) and Device Type (Mobile / Cell) intelligent matching
    if (matchedIndex === -1) {
      const isPhoneOrCountrySelect =
        select.name.toLowerCase().includes('phone') ||
        select.name.toLowerCase().includes('mobile') ||
        select.name.toLowerCase().includes('country') ||
        select.name.toLowerCase().includes('dial') ||
        select.id.toLowerCase().includes('phone') ||
        select.id.toLowerCase().includes('mobile') ||
        select.id.toLowerCase().includes('country') ||
        select.id.toLowerCase().includes('dial') ||
        select.closest('[class*="phone"], [class*="mobile"], [class*="tel"]') !== null ||
        normTarget.includes('+91') ||
        normTarget.includes('91');

      if (isPhoneOrCountrySelect) {
        // 1. Check for Country Code options (+91, India, IN, 91)
        for (let i = 0; i < select.options.length; i++) {
          const opt = select.options[i];
          const optVal = opt.value.toLowerCase().trim();
          const optText = opt.text.toLowerCase().trim();
          if (
            optVal === '+91' ||
            optVal === '91' ||
            optVal === 'in' ||
            optText.includes('+91') ||
            optText.includes('india') ||
            optText.includes('ind (+91)') ||
            optText.includes('india (+91)')
          ) {
            matchedIndex = i;
            break;
          }
        }

        // 2. Check for Phone Device Type options (Mobile, Cell, Cellular, Personal)
        if (matchedIndex === -1) {
          for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i];
            const optVal = opt.value.toLowerCase().trim();
            const optText = opt.text.toLowerCase().trim();
            if (
              optVal === 'mobile' ||
              optVal === 'cell' ||
              optVal === 'cellular' ||
              optVal === 'personal' ||
              optText.includes('mobile') ||
              optText.includes('cell')
            ) {
              matchedIndex = i;
              break;
            }
          }
        }
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
    const isYesMatch = ['yes', 'true', '1'].includes(normVal) && ['yes', 'true', '1'].includes(radioVal);
    const isNoMatch = ['no', 'false', '0'].includes(normVal) && ['no', 'false', '0'].includes(radioVal);
    if (radioVal === normVal || isYesMatch || isNoMatch) {
      input.click();
    }
  }

  private highlightElement(el: HTMLElement): void {
    const originalBorder = el.style.border;
    const originalBg = el.style.backgroundColor;
    const originalTransition = el.style.transition;

    el.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.border = '2px solid #8B74F0';
    el.style.backgroundColor = 'rgba(139, 116, 240, 0.12)';

    setTimeout(() => {
      el.style.border = originalBorder;
      el.style.backgroundColor = originalBg;
      el.style.transition = originalTransition;
    }, 1500);
  }
}

export const autofillEngine = new AutofillEngine();
