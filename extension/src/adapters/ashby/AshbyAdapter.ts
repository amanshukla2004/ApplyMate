import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';

export class AshbyAdapter implements FormAdapter {
  readonly name = 'Ashby Application Portal';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('jobs.ashbyhq.com') ||
      url.includes('ashbyhq.com') ||
      !!doc.querySelector('[data-ashby], .ashby-application-form, form[action*="ashbyhq"]')
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    const fields = domScanner.scan();

    for (const f of fields) {
      const nameLower = (f.name || '').toLowerCase();
      const labelLower = (f.label || '').toLowerCase();
      const placeholderLower = (f.placeholder || '').toLowerCase();
      const ariaLower = (f.ariaLabel || '').toLowerCase();

      if (
        nameLower === 'name' ||
        nameLower === 'fullname' ||
        labelLower.includes('full name') ||
        ariaLower.includes('full name')
      ) {
        f.canonicalField = 'FULL_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower === 'firstname' ||
        nameLower === 'first_name' ||
        labelLower === 'first name' ||
        placeholderLower.includes('first name')
      ) {
        f.canonicalField = 'FIRST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower === 'lastname' ||
        nameLower === 'last_name' ||
        labelLower === 'last name' ||
        placeholderLower.includes('last name')
      ) {
        f.canonicalField = 'LAST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower === 'email' ||
        f.fieldType === 'email' ||
        labelLower.includes('email')
      ) {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower === 'phonenumber' ||
        nameLower === 'phone' ||
        f.fieldType === 'tel' ||
        labelLower.includes('phone')
      ) {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower.includes('linkedin') ||
        labelLower.includes('linkedin') ||
        placeholderLower.includes('linkedin')
      ) {
        f.canonicalField = 'LINKEDIN_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower.includes('github') ||
        labelLower.includes('github') ||
        placeholderLower.includes('github')
      ) {
        f.canonicalField = 'GITHUB_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower.includes('website') ||
        nameLower.includes('portfolio') ||
        labelLower.includes('portfolio') ||
        placeholderLower.includes('portfolio') ||
        labelLower.includes('personal website')
      ) {
        f.canonicalField = 'PORTFOLIO_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        nameLower.includes('location') ||
        labelLower.includes('current location') ||
        labelLower.includes('city')
      ) {
        f.canonicalField = 'CITY';
        f.confidence = 0.9;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('authorized to work') ||
        labelLower.includes('work authorization') ||
        labelLower.includes('legally authorized')
      ) {
        f.canonicalField = 'WORK_AUTHORIZATION';
        f.confidence = 0.95;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('gender')
      ) {
        f.canonicalField = 'GENDER';
        f.confidence = 0.95;
        f.status = 'MATCHED';
      } else if (
        labelLower.includes('race') ||
        labelLower.includes('ethnicity')
      ) {
        f.canonicalField = 'RACE_ETHNICITY';
        f.confidence = 0.95;
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
