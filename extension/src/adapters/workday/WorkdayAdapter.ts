import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';

export class WorkdayAdapter implements FormAdapter {
  readonly name = 'Workday Career Portal';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('myworkdayjobs.com') ||
      url.includes('workday.com') ||
      !!doc.querySelector('[data-automation-id*="form"], [data-automation-id*="apply"]')
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();

    for (const f of fields) {
      const el = domScanner.getElement(f.id);
      const autoId = (el?.getAttribute('data-automation-id') || '').toLowerCase();
      const labelLower = (f.label || '').toLowerCase();

      if (autoId.includes('firstname') || autoId.includes('legalname_first')) {
        f.canonicalField = 'FIRST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('lastname') || autoId.includes('legalname_last')) {
        f.canonicalField = 'LAST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('email')) {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('phone')) {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('addresssection_addressline1')) {
        f.canonicalField = 'ADDRESS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('city')) {
        f.canonicalField = 'CITY';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('postalcode')) {
        f.canonicalField = 'ZIP_CODE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('degree') || labelLower.includes('degree')) {
        f.canonicalField = 'DEGREE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('fieldofstudy') || labelLower.includes('field of study') || labelLower.includes('major')) {
        f.canonicalField = 'BRANCH';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('skill') || labelLower.includes('skill')) {
        f.canonicalField = 'SKILLS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (autoId.includes('school') || labelLower.includes('school') || labelLower.includes('university')) {
        f.canonicalField = 'COLLEGE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      }
    }

    // Scan Workday Questionnaire & Custom Application Questions
    const questionLabels = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-automation-id="formLabel"], label[id*="prompt"], [data-automation-id*="question"]'
      )
    );

    for (const qLabel of questionLabels) {
      const rawText = qLabel.textContent?.trim();
      if (!rawText || rawText.length < 5) continue;

      const container =
        qLabel.closest(
          '[data-automation-id*="formField"], div[id*="question"], div[data-uxi-element-id*="formField"]'
        ) || qLabel.parentElement;
      if (!container) continue;

      const control = container.querySelector<HTMLElement>(
        'button[data-automation-id="searchBox"], button[aria-haspopup="listbox"], [data-automation-id="select-box"], input:not([type="hidden"]), select, textarea'
      );

      if (control) {
        const alreadyRegistered = fields.some((f) => domScanner.getElement(f.id) === control);
        if (!alreadyRegistered) {
          const isButton = control.tagName.toUpperCase() === 'BUTTON';
          const fieldId = domScanner.registerElement(control);
          const cleanText = rawText.replace(/\s*\*+\s*$/, '').trim();
          const cleanLower = cleanText.toLowerCase();

          let defaultOpt = 'Yes';
          if (
            cleanLower.includes('gap in your employment') ||
            cleanLower.includes('post-graduate') ||
            cleanLower.includes('interview with us before') ||
            cleanLower.includes('kpmg') ||
            cleanLower.includes('overseas citizen')
          ) {
            defaultOpt = 'No';
          }

          fields.push({
            id: fieldId,
            tagName: control.tagName.toUpperCase(),
            fieldType: isButton ? 'select' : (control.getAttribute('type') || 'text').toLowerCase(),
            label: cleanText,
            required: rawText.includes('*') || control.hasAttribute('required'),
            confidence: 0.95,
            status: 'MATCHED',
            options: [
              { label: defaultOpt, value: defaultOpt },
              { label: defaultOpt === 'Yes' ? 'No' : 'Yes', value: defaultOpt === 'Yes' ? 'No' : 'Yes' },
            ],
          });
        }
      }
    }

    return fields;
  }

  async fillField(fieldId: string, value: string): Promise<FillResult> {
    const el = domScanner.getElement(fieldId);
    if (el && el.tagName.toUpperCase() === 'BUTTON') {
      try {
        el.click();
        await new Promise((r) => setTimeout(r, 200));

        const normVal = value.toLowerCase().trim();
        const options = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="option"], [data-automation-id*="promptOption"], li[data-uxi-element-id*="select"]'
          )
        );
        const targetOpt = options.find((opt) => {
          const text = (opt.textContent || '').toLowerCase().trim();
          return text === normVal || text.includes(normVal) || normVal.includes(text);
        });

        if (targetOpt) {
          targetOpt.click();
          return { fieldId, success: true, message: 'Workday option selected' };
        }
      } catch (err) {
        console.warn('Workday button click failed, falling back to standard engine:', err);
      }
    }
    return autofillEngine.fillField(fieldId, value);
  }

  async fillFields(values: Record<string, string>): Promise<FillResult[]> {
    const results: FillResult[] = [];
    for (const [fieldId, val] of Object.entries(values)) {
      if (val !== undefined && val !== null) {
        const res = await this.fillField(fieldId, String(val));
        results.push(res);
      }
    }
    return results;
  }

  getMetadata(): WebsiteMetadata {
    return {
      url: window.location.href,
      hostname: window.location.hostname,
      adapterName: this.name,
      title: document.title,
    };
  }
}
