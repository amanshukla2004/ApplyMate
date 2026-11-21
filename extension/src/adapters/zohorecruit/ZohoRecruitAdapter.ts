import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';
import { LabelExtractor } from '../../content/labelExtractor';

export class ZohoRecruitAdapter implements FormAdapter {
  readonly name = 'Zoho Recruit';

  isSupported(url: string, doc: Document): boolean {
    const u = (url || '').toLowerCase();
    return (
      u.includes('zohorecruit.') ||
      u.includes('zohopublic.') ||
      u.includes('recruit.zoho.') ||
      u.includes('.zoho.in') ||
      u.includes('.zoho.com') ||
      !!doc.querySelector(
        'form[action*="zohorecruit"], [id*="rec-form_"], [id*="rec_form_"], [class*="crc-"], [class*="rec-"], [class*="cw-"], crux-text-component, crux-phone-component, crux-email-component, crux-picklist-component, [action*="recruit"]'
      )
    );
  }

  private resolveZohoFieldLabel(el: HTMLElement): string {
    // 1. Direct Zoho attributes on the input element
    const direct =
      el.getAttribute('fieldlabel') ||
      el.getAttribute('data-label') ||
      el.getAttribute('data-fieldname') ||
      el.getAttribute('data-field-name') ||
      el.getAttribute('data-zc-field') ||
      el.getAttribute('cx-prop-label') ||
      el.getAttribute('title');
    if (direct && !LabelExtractor.isInvalidPlaceholder(direct)) {
      return LabelExtractor.cleanLabel(direct);
    }

    // 1b. Check Crux Web Component wrapper (crux-text-component, crux-phone-component, etc.)
    const cruxComp = el.closest(
      '[cx-prop-label], [data-zcqa], [cx-prop-zcqa], crux-text-component, crux-phone-component, crux-email-component, crux-picklist-component'
    );
    if (cruxComp) {
      const cxLabel = cruxComp.getAttribute('cx-prop-label');
      if (cxLabel && !LabelExtractor.isInvalidPlaceholder(cxLabel)) {
        return LabelExtractor.cleanLabel(cxLabel);
      }
      const zcqa = cruxComp.getAttribute('data-zcqa') || cruxComp.getAttribute('cx-prop-zcqa');
      if (zcqa) {
        const cleaned = LabelExtractor.cleanLabel(LabelExtractor.formatIdentifier(zcqa.replace(/^(rec_|manual_)/i, '')));
        if (cleaned && !LabelExtractor.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 2. Check if Salutation / Title select ([-None-, Mr., Ms., Mrs., Dr.])
    if (el.tagName === 'SELECT') {
      const select = el as HTMLSelectElement;
      const texts = Array.from(select.options).map((o) => o.text.trim().toLowerCase());
      if (texts.includes('mr.') || texts.includes('ms.') || (texts.includes('-none-') && texts.length < 10)) {
        return 'Title';
      }
    }

    // 3. Check table row (tr), crux row (.crc-form-row), or form row / container
    const row = el.closest(
      '.crc-form-row, [class*="crc-rec-form"], tr, .form-row, .row, [class*="row"], [class*="field"], [class*="group"], [class*="cw-"], [class*="rec-"]'
    );
    if (row) {
      // Find explicit label element or label container inside row
      const labelEl = row.querySelector<HTMLElement>(
        '.crm-from-label, .crc-label-text, .crc-form-label, [id*="crc-label"], label, .rec-label, .rec-form-label, .field-label, [class*="label"], [class*="lbl"], th, td:first-child'
      );
      if (labelEl && !labelEl.contains(el)) {
        const text = labelEl.textContent?.trim() || '';
        if (text && !LabelExtractor.isInvalidPlaceholder(text) && text.length < 150) {
          // If this row has multiple inputs (e.g. Title select + First Name input, or Dial Code + Mobile input)
          const allInputs = Array.from(row.querySelectorAll('input:not([type="hidden"]), select'));
          if (allInputs.length > 1) {
            const index = allInputs.indexOf(el);
            if (index === 0 && el.tagName === 'SELECT') {
              return 'Title';
            }
            if (index === 0 && (el.getAttribute('placeholder') || '').toLowerCase().includes('dial')) {
              return 'Country Dial Code';
            }
          }
          return LabelExtractor.cleanLabel(text);
        }
      }
    }

    return '';
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();

    for (const f of fields) {
      const el = domScanner.getElement(f.id);
      if (el) {
        // If it's a Salutation / Title select placed inside a First Name container
        if (el.tagName === 'SELECT') {
          const select = el as HTMLSelectElement;
          const texts = Array.from(select.options).map((o) => o.text.trim().toLowerCase());
          if (texts.includes('mr.') || texts.includes('ms.') || texts.includes('mr') || texts.includes('ms')) {
            f.label = 'Title';
          }
        }

        // If it's a dial code search input
        if ((el.getAttribute('placeholder') || '').toLowerCase().includes('dial')) {
          f.label = 'Search country with dial code';
        }

        // If label is unknown, placeholder, or technical internal id (e.g. rec form ...), use Zoho-specific DOM inspection
        if (!f.label || f.label.startsWith('Field #') || f.label.toLowerCase().includes('rec form') || LabelExtractor.isInvalidPlaceholder(f.label)) {
          const refined = this.resolveZohoFieldLabel(el);
          if (refined) {
            f.label = refined;
          }
        }
      }

      const nameLower = (f.name || '').toLowerCase();
      const labelLower = (f.label || '').toLowerCase();

      // Refine canonical matching for Zoho Recruit portal fields
      if (
        labelLower === 'first name' ||
        labelLower.includes('first name') ||
        nameLower.includes('first_name') ||
        nameLower.includes('firstname')
      ) {
        f.canonicalField = 'FIRST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower === 'last name' ||
        labelLower.includes('last name') ||
        nameLower.includes('last_name') ||
        nameLower.includes('lastname')
      ) {
        f.canonicalField = 'LAST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('email') ||
        f.fieldType === 'email' ||
        nameLower.includes('email')
      ) {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.startsWith('mobile') ||
        labelLower.includes('mobile number') ||
        labelLower.includes('phone') ||
        nameLower.includes('mobile') ||
        nameLower.includes('phone')
      ) {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.startsWith('street') ||
        labelLower === 'address' ||
        nameLower.includes('street')
      ) {
        f.canonicalField = 'ADDRESS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.startsWith('city') ||
        nameLower.includes('city')
      ) {
        f.canonicalField = 'CITY';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.startsWith('portfolio') ||
        labelLower.includes('portfolio') ||
        nameLower.includes('portfolio')
      ) {
        f.canonicalField = 'PORTFOLIO_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('linkedin') ||
        labelLower.includes('linked in') ||
        nameLower.includes('linkedin')
      ) {
        f.canonicalField = 'LINKEDIN_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('facebook') ||
        labelLower.includes('face book') ||
        nameLower.includes('facebook')
      ) {
        f.canonicalField = 'FACEBOOK_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('why noct') ||
        labelLower.includes('why ') ||
        labelLower.includes('why do you want') ||
        labelLower.includes('why are you interested')
      ) {
        f.confidence = 0.85;
        f.status = 'NEEDS_REVIEW';
      } else if (
        labelLower.includes('about you') ||
        labelLower.includes('tell us about yourself') ||
        labelLower.includes('introduce yourself')
      ) {
        f.confidence = 0.85;
        f.status = 'NEEDS_REVIEW';
      } else if (
        labelLower.includes('relocate') ||
        labelLower.includes('relocation') ||
        labelLower.includes('willing to relocate')
      ) {
        f.canonicalField = 'RELOCATION';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('no objection') ||
        /\bnoc\b/i.test(labelLower)
      ) {
        f.canonicalField = 'UNIVERSITY_NOC';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        f.fieldType === 'file' ||
        labelLower.includes('resume') ||
        labelLower.includes('cv') ||
        nameLower.includes('resume') ||
        nameLower.includes('cv')
      ) {
        f.canonicalField = 'RESUME';
        f.confidence = 0.9;
        f.status = 'MATCHED';
      }
    }

    return fields;
  }

  async fillField(fieldId: string, value: string): Promise<FillResult> {
    return autofillEngine.fillField(fieldId, value);
  }

  async fillFields(values: Record<string, string>): Promise<FillResult[]> {
    return autofillEngine.fillMultiple(values);
  }

  getMetadata(): WebsiteMetadata {
    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      hostname: typeof window !== 'undefined' ? window.location.hostname : '',
      adapterName: this.name,
      title: typeof document !== 'undefined' ? document.title : '',
    };
  }
}
