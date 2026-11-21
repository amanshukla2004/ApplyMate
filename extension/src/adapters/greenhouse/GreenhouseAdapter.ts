import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';

export class GreenhouseAdapter implements FormAdapter {
  readonly name = 'Greenhouse Job Board';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('greenhouse.io') ||
      url.includes('boards.greenhouse.io') ||
      !!doc.querySelector('#application_form, #application-form, form[action*="greenhouse"]')
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();
    // Greenhouse specific refinements:
    for (const f of fields) {
      if (f.elementId === 'first_name' || f.name === 'first_name') {
        f.canonicalField = 'FIRST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.elementId === 'last_name' || f.name === 'last_name') {
        f.canonicalField = 'LAST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.elementId === 'email' || f.name === 'email') {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.elementId === 'phone' || f.name === 'phone') {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[LinkedIn]')) {
        f.canonicalField = 'LINKEDIN_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[GitHub]')) {
        f.canonicalField = 'GITHUB_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('urls[Portfolio]') || f.name?.includes('urls[Website]')) {
        f.canonicalField = 'PORTFOLIO_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('job_application[gender]')) {
        f.canonicalField = 'GENDER';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('job_application[race]') || f.name?.includes('job_application[ethnicity]')) {
        f.canonicalField = 'RACE_ETHNICITY';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('job_application[veteran_status]')) {
        f.canonicalField = 'VETERAN_STATUS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (f.name?.includes('job_application[disability_status]')) {
        f.canonicalField = 'DISABILITY_STATUS';
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
