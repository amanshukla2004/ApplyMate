import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';

export class LeverAdapter implements FormAdapter {
  readonly name = 'Lever Application Form';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('jobs.lever.co') ||
      url.includes('lever.co') ||
      !!doc.querySelector('.application-form, form[action*="lever.co"]')
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();
    for (const f of fields) {
      if (f.name === 'name') {
        f.canonicalField = 'FULL_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name === 'email') {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name === 'phone') {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name === 'org') {
        f.canonicalField = 'EXPERIENCE';
        f.confidence = 0.8;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[LinkedIn]')) {
        f.canonicalField = 'LINKEDIN_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[GitHub]')) {
        f.canonicalField = 'GITHUB_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[Portfolio]')) {
        f.canonicalField = 'PORTFOLIO_URL';
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
