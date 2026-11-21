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
      const name = (f.name || '').toLowerCase();
      const id = (f.elementId || '').toLowerCase();
      const label = (f.label || '').toLowerCase();

      if (id === 'first_name' || name === 'first_name' || name.includes('[first_name]')) {
        f.canonicalField = 'FIRST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (id === 'last_name' || name === 'last_name' || name.includes('[last_name]')) {
        f.canonicalField = 'LAST_NAME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (id === 'email' || name === 'email' || name.includes('[email]')) {
        f.canonicalField = 'EMAIL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (id === 'phone' || name === 'phone' || name.includes('[phone]')) {
        f.canonicalField = 'PHONE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        name.includes('candidate_location') ||
        id.includes('candidate_location') ||
        name.includes('location') ||
        id.includes('location') ||
        label.includes('location (city)') ||
        label === 'location' ||
        label === 'city'
      ) {
        f.canonicalField = 'CITY';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('urls[linkedin]') || id.includes('linkedin') || label.includes('linkedin')) {
        f.canonicalField = 'LINKEDIN_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('urls[github]') || id.includes('github') || label.includes('github')) {
        f.canonicalField = 'GITHUB_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (
        name.includes('urls[portfolio]') ||
        name.includes('urls[website]') ||
        id.includes('portfolio') ||
        id.includes('website') ||
        label === 'website' ||
        label === 'portfolio'
      ) {
        f.canonicalField = 'PORTFOLIO_URL';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('school_name') || id.includes('school_name')) {
        f.canonicalField = 'COLLEGE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('degree') || id.includes('degree')) {
        f.canonicalField = 'DEGREE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('discipline') || id.includes('discipline')) {
        f.canonicalField = 'BRANCH';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('start_date_month') || id.includes('start_date_month') || label.includes('start date month') || label === 'start month') {
        f.canonicalField = 'START_MONTH';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('start_date_year') || id.includes('start_date_year') || label.includes('start date year') || label === 'start year') {
        f.canonicalField = 'START_YEAR';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('end_date_month') || id.includes('end_date_month') || label.includes('end date month') || label === 'end month') {
        f.canonicalField = 'END_MONTH';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('end_date_year') || id.includes('end_date_year') || label.includes('end date year') || label === 'end year') {
        f.canonicalField = 'END_YEAR';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (label.includes('no objection') || label.includes('noc')) {
        f.canonicalField = 'UNIVERSITY_NOC';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (label.includes('relocate') || label.includes('relocation')) {
        f.canonicalField = 'RELOCATION';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (label.includes('office') && (label.includes('come') || label.includes('days a week') || label.includes('based'))) {
        f.canonicalField = 'IN_OFFICE';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (label.includes('internship') && (label.includes('duration') || label.includes('6 months') || label.includes('24 weeks') || label.includes('full-time') || label.includes('full time') || label.includes('approx'))) {
        f.canonicalField = 'INTERNSHIP_DURATION';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (label.includes('backlog') || label.includes('arrear')) {
        f.canonicalField = 'BACKLOGS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (id === 'resume' || name.includes('resume') || label.includes('resume')) {
        f.canonicalField = 'RESUME';
        f.confidence = 1.0;
        f.status = 'MATCHED';
        f.fieldType = 'file';
        f.label = 'Resume / CV';
      } else if (id.includes('cover_letter') || name.includes('cover_letter') || label.includes('cover letter')) {
        f.canonicalField = 'COVER_LETTER';
        f.confidence = 1.0;
        f.status = 'MATCHED';
        f.label = 'Cover Letter';
      } else if (name.includes('job_application[gender]')) {
        f.canonicalField = 'GENDER';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('job_application[race]') || name.includes('job_application[ethnicity]')) {
        f.canonicalField = 'RACE_ETHNICITY';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('job_application[veteran_status]')) {
        f.canonicalField = 'VETERAN_STATUS';
        f.confidence = 1.0;
        f.status = 'MATCHED';
      } else if (name.includes('job_application[disability_status]')) {
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
