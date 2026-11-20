import { FormAdapter } from '../FormAdapter';
import { DetectedField, FillResult, WebsiteMetadata } from '../../types/messaging';
import { domScanner } from '../../content/domScanner';
import { autofillEngine } from '../../content/autofillEngine';

export class LinkedInAdapter implements FormAdapter {
  readonly name = 'LinkedIn Easy Apply';

  isSupported(url: string, doc: Document): boolean {
    return (
      url.includes('linkedin.com/jobs') ||
      !!doc.querySelector('.jobs-easy-apply-form, [data-easy-apply-modal]')
    );
  }

  async scanForm(): Promise<DetectedField[]> {
    return domScanner.scan();
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
