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
      url: window.location.href,
      hostname: window.location.hostname,
      adapterName: this.name,
      title: document.title,
    };
  }
}
