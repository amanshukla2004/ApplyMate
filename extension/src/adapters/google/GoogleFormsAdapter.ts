import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';

export class GoogleFormsAdapter implements FormAdapter {
  readonly name = 'Google Forms';

  isSupported(url: string, _doc: Document): boolean {
    return url.includes('docs.google.com/forms');
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();

    // Refine Google Forms fields
    for (const f of fields) {
      const el = domScanner.getElement(f.id);
      if (!el) continue;

      // In Google Forms, label comes from question header
      const formItem = el.closest('[role="listitem"], .Qr7Oae');
      if (formItem) {
        const titleEl = formItem.querySelector('[role="heading"], .M7eMe');
        const questionTitle = titleEl?.textContent?.trim();

        if (questionTitle) {
          f.label = questionTitle.replace(/\s*\*+\s*$/, '');
          const lower = f.label.toLowerCase();

          if (lower === 'name' || lower.includes('full name') || lower.includes('your name') || lower.includes('candidate name')) {
            f.canonicalField = 'FULL_NAME';
            f.confidence = 1.0;
            f.status = 'MATCHED';
          } else if (lower.includes('email') || lower.includes('e-mail')) {
            f.canonicalField = 'EMAIL';
            f.confidence = 1.0;
            f.status = 'MATCHED';
          } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact number')) {
            f.canonicalField = 'PHONE';
            f.confidence = 1.0;
            f.status = 'MATCHED';
          } else if (lower.includes('address') || lower.includes('location')) {
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
          } else if (lower.includes('notice') || lower.includes('how soon')) {
            f.canonicalField = 'NOTICE_PERIOD';
            f.confidence = 1.0;
            f.status = 'MATCHED';
          }
        }
      }
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
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));
      el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

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
