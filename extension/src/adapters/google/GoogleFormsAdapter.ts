import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';

export class GoogleFormsAdapter implements FormAdapter {
  readonly name = 'Google Forms';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('docs.google.com/forms') ||
      url.includes('/forms/d/e/') ||
      (url.includes('google.com') &&
        !!doc.querySelector('.freebirdFormviewerViewFormCard, [role="listitem"] .M7eMe, form[action*="forms/d/e"]'))
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();

    // Refine Google Forms fields
    for (const f of fields) {
      const el = domScanner.getElement(f.id);
      if (!el) continue;

      let questionTitle = '';

      // In Google Forms, label comes from question container header
      const formItem = el.closest(
        '[role="listitem"], .Qr7Oae, .geS5n, [data-item-id], .freebirdFormviewerViewNumberedItemContainer, .freebirdFormviewerViewItemsItemItem'
      );
      if (formItem) {
        const titleEl = formItem.querySelector(
          '[role="heading"], .M7eMe, .FwR7Pc, .HoGqGc, .freebirdFormviewerViewItemsItemItemTitle, [aria-level="3"]'
        );
        if (titleEl && titleEl.textContent) {
          questionTitle = titleEl.textContent.trim();
        }
      }

      // Fallback 1: check aria-labelledby
      if (!questionTitle) {
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
          const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
          const parts = ids
            .map((id) => document.getElementById(id)?.textContent?.trim())
            .filter(Boolean);
          if (parts.length > 0) {
            questionTitle = parts.join(' ');
          }
        }
      }

      // Fallback 2: check aria-label
      if (!questionTitle) {
        questionTitle = el.getAttribute('aria-label') || '';
      }

      if (questionTitle) {
        // Strip asterisks and whitespace
        f.label = questionTitle.replace(/\*/g, '').replace(/[\n\r\t]+/g, ' ').trim();
        const lower = f.label.toLowerCase();

        if (
          lower === 'name' ||
          lower.includes('full name') ||
          lower.includes('your name') ||
          lower.includes('candidate name') ||
          lower.includes('first and last name')
        ) {
          f.canonicalField = 'FULL_NAME';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('email') || lower.includes('e-mail') || lower.includes('mail')) {
          f.canonicalField = 'EMAIL';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (
          lower.includes('phone') ||
          lower.includes('mobile') ||
          lower.includes('contact number') ||
          lower.includes('contact') ||
          lower.includes('whatsapp')
        ) {
          f.canonicalField = 'PHONE';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('address') || lower.includes('location') || lower.includes('city')) {
          f.canonicalField = 'ADDRESS';
          f.confidence = 0.9;
          f.status = 'MATCHED';
        } else if (lower.includes('linkedin')) {
          f.canonicalField = 'LINKEDIN_URL';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('github')) {
          f.canonicalField = 'GITHUB_URL';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('portfolio') || lower.includes('website')) {
          f.canonicalField = 'PORTFOLIO_URL';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('college') || lower.includes('university') || lower.includes('institution')) {
          f.canonicalField = 'COLLEGE';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('degree') || lower.includes('qualification')) {
          f.canonicalField = 'DEGREE';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('cgpa') || lower.includes('gpa') || lower.includes('percentage')) {
          f.canonicalField = 'CGPA';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('experience') || lower.includes('years of experience')) {
          f.canonicalField = 'EXPERIENCE';
          f.confidence = 0.9;
          f.status = 'MATCHED';
        } else if (lower.includes('notice') || lower.includes('how soon') || lower.includes('availability')) {
          f.canonicalField = 'NOTICE_PERIOD';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('gender') || lower.includes('sex')) {
          f.canonicalField = 'GENDER';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        } else if (lower.includes('race') || lower.includes('ethnicity')) {
          f.canonicalField = 'RACE_ETHNICITY';
          f.confidence = 1.0;
          f.status = 'MATCHED';
        }
      }
    }

    // Scan Google Forms custom radio & checkbox question cards
    const questionCards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role="listitem"], .Qr7Oae, .geS5n, .freebirdFormviewerViewNumberedItemContainer'
      )
    );

    for (const card of questionCards) {
      // Skip if this card already contains a text input/textarea that was scanned
      const hasStandardInput = card.querySelector(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
      );
      if (hasStandardInput) continue;

      const radioOptions = Array.from(card.querySelectorAll<HTMLElement>('[role="radio"]'));
      const checkboxOptions = Array.from(card.querySelectorAll<HTMLElement>('[role="checkbox"]'));

      if (radioOptions.length === 0 && checkboxOptions.length === 0) continue;

      const isRadio = radioOptions.length > 0;
      const optionElements = isRadio ? radioOptions : checkboxOptions;

      const titleEl = card.querySelector(
        '[role="heading"], .M7eMe, .FwR7Pc, .HoGqGc, .freebirdFormviewerViewItemsItemItemTitle, [aria-level="3"]'
      );
      const rawTitle = titleEl?.textContent?.trim() || '';
      const cleanTitle = rawTitle.replace(/\*/g, '').replace(/[\n\r\t]+/g, ' ').trim() || `Choice Question #${fields.length + 1}`;
      const isRequired = rawTitle.includes('*') || card.querySelector('.v3Duub') !== null;

      const optionsList = optionElements.map((opt) => {
        const label =
          opt.getAttribute('aria-label') ||
          opt.getAttribute('data-value') ||
          opt.closest('.docssharedWizToggleLabeledContainer')?.querySelector('.aDTYNe, .docssharedWizToggleLabeledContent')?.textContent?.trim() ||
          opt.textContent?.trim() ||
          'Option';
        return {
          label: label.trim(),
          value: label.trim(),
        };
      });

      const fieldId = domScanner.registerElement(card);

      fields.push({
        id: fieldId,
        tagName: 'DIV',
        fieldType: isRadio ? 'radio' : 'checkbox',
        label: cleanTitle,
        required: isRequired,
        options: optionsList,
        confidence: 0.8,
        status: 'NEEDS_REVIEW',
      });
    }

    return fields;
  }

  async fillField(fieldId: string, value: string): Promise<FillResult> {
    const el = domScanner.getElement(fieldId);
    if (!el) {
      return {
        fieldId,
        success: false,
        message: 'Google Forms input not found in DOM',
        errorCode: 'ELEMENT_NOT_FOUND',
      };
    }

    try {
      // Check if element is a question container containing radio or checkbox
      const radioOrCheckbox = el.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]');
      if (radioOrCheckbox.length > 0) {
        const targetVal = value.toLowerCase().trim();
        for (const opt of Array.from(radioOrCheckbox)) {
          const optLabel = (
            opt.getAttribute('aria-label') ||
            opt.getAttribute('data-value') ||
            opt.closest('.docssharedWizToggleLabeledContainer')?.querySelector('.aDTYNe')?.textContent ||
            opt.textContent ||
            ''
          ).toLowerCase().trim();

          if (optLabel === targetVal || optLabel.includes(targetVal) || targetVal.includes(optLabel)) {
            opt.click();
            opt.dispatchEvent(new Event('change', { bubbles: true }));
            opt.dispatchEvent(new Event('input', { bubbles: true }));
            return {
              fieldId,
              success: true,
              message: `Selected choice: ${value}`,
            };
          }
        }
      }

      el.focus();

      // Native prototype setter
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(el, value);
      } else {
        (el as HTMLInputElement).value = value;
      }

      // Google Forms reactive listeners
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
      } catch {
        // Fallback if InputEvent not supported
      }
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));
      el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

      // Visual highlight
      const origBorder = el.style.border;
      el.style.border = '2px solid #6366f1';
      setTimeout(() => {
        el.style.border = origBorder;
      }, 1500);

      return {
        fieldId,
        success: true,
        message: 'Successfully filled Google Forms field',
      };
    } catch (err) {
      return {
        fieldId,
        success: false,
        message: (err as Error).message,
        errorCode: 'GOOGLE_FORM_FILL_ERROR',
      };
    }
  }

  async fillFields(values: Record<string, string>): Promise<FillResult[]> {
    const results: FillResult[] = [];
    for (const [id, val] of Object.entries(values)) {
      results.push(await this.fillField(id, val));
    }
    return results;
  }

  getMetadata(): WebsiteMetadata {
    return {
      url: window.location.href,
      hostname: 'docs.google.com',
      adapterName: this.name,
      title: document.title || 'Google Form',
    };
  }
}
