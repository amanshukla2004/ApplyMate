import { describe, it, expect, beforeEach } from 'vitest';
import { LabelExtractor } from '../src/content/labelExtractor';

describe('LabelExtractor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts label from <label for="id">', () => {
    document.body.innerHTML = `
      <label for="first-name-input">First Name *</label>
      <input id="first-name-input" type="text" />
    `;
    const input = document.getElementById('first-name-input')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('First Name');
  });

  it('extracts label from enclosing <label>', () => {
    document.body.innerHTML = `
      <label>
        Email Address (required):
        <input id="email-input" type="email" />
      </label>
    `;
    const input = document.getElementById('email-input')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Email Address');
  });

  it('extracts label from aria-label', () => {
    document.body.innerHTML = `
      <input id="phone-input" type="tel" aria-label="Mobile Phone Number" />
    `;
    const input = document.getElementById('phone-input')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Mobile Phone Number');
  });

  it('falls back to placeholder if no label element exists', () => {
    document.body.innerHTML = `
      <input id="zip-input" type="text" placeholder="Postal Code" />
    `;
    const input = document.getElementById('zip-input')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Postal Code');
  });

  it('extracts label in Google Forms with space-separated aria-labelledby IDs', () => {
    document.body.innerHTML = `
      <div id="i1">Full Name</div>
      <span id="i4">*</span>
      <input id="name-input" type="text" aria-labelledby="i1 i4" />
    `;
    const input = document.getElementById('name-input')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Full Name');
  });

  it('extracts label from Google Forms role="listitem" question card', () => {
    document.body.innerHTML = `
      <div role="listitem" class="Qr7Oae">
        <div role="heading" class="M7eMe">Phone number *</div>
        <div class="AgroD">
          <input id="phone-gf" type="text" />
        </div>
      </div>
    `;
    const input = document.getElementById('phone-gf')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Phone number');
  });

  it('does not extract placeholder "Select..." and falls back to question container label', () => {
    document.body.innerHTML = `
      <div class="field">
        <label>Are your university will be able to provide an "No Objection Certificate" *</label>
        <div class="select-wrapper">
          <input id="noc-select" type="text" placeholder="Select..." />
        </div>
      </div>
    `;
    const input = document.getElementById('noc-select')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Are your university will be able to provide an "No Objection Certificate"');
  });

  it('does not extract button text "Attach" for resume file upload', () => {
    document.body.innerHTML = `
      <div class="field">
        <label>Resume/CV *</label>
        <button type="button">Attach</button>
        <input id="resume-file" type="file" />
      </div>
    `;
    const input = document.getElementById('resume-file')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Resume/CV');
  });

  it('extracts label from multi-level nested container in Zoho Recruit and rejects rec_form IDs', () => {
    document.body.innerHTML = `
      <div class="rec-form-row form-group">
        <div class="rec-field-label col-sm-4">
          <label class="control-label">Mobile *</label>
        </div>
        <div class="rec-field-value col-sm-8">
          <div class="input-container">
            <input id="rec_form_40797000000003149" name="rec_form_40797000000003149" type="text" />
          </div>
        </div>
      </div>
    `;
    const input = document.getElementById('rec_form_40797000000003149')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe('Mobile');
  });

  it('rejects internal hashes and technical IDs in isInvalidPlaceholder', () => {
    expect(LabelExtractor.isInvalidPlaceholder('rec form 40797000000003149')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('rec_form_40797000000003149')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('field #8')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('Field #12')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('40797000000003149')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('Select...')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('Attach')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('-None-')).toBe(true);
    expect(LabelExtractor.isInvalidPlaceholder('Mobile')).toBe(false);
    expect(LabelExtractor.isInvalidPlaceholder('Portfolio')).toBe(false);
  });

  it('extracts label with (?) help tooltip cleanly in Zoho Recruit', () => {
    document.body.innerHTML = `
      <div class="rec-field-row">
        <div class="rec-label">
          Portfolio (BD, Web Operator and Founder's office candidates can add their linkedin or professional profiles) * (?)
        </div>
        <div class="rec-input">
          <input id="rec_form_40797000000003151" name="rec_form_40797000000003151" type="text" />
        </div>
      </div>
    `;
    const input = document.getElementById('rec_form_40797000000003151')!;
    const label = LabelExtractor.extractLabel(input);
    expect(label).toBe(
      "Portfolio (BD, Web Operator and Founder's office candidates can add their linkedin or professional profiles)"
    );
  });

  it('strips Zoho CRM type suffix _s from data-zcqa and normalizes brand names like LinkedIn and Facebook', () => {
    document.body.innerHTML = `
      <div class="crc-form-row">
        <crux-text-component data-zcqa="rec_LinkedIn_s">
          <div class="lyteField">
            <input id="rec_linkedin_input" type="text" />
          </div>
        </crux-text-component>
      </div>
      <div class="crc-form-row">
        <crux-text-component data-zcqa="rec_Facebook_s">
          <div class="lyteField">
            <input id="rec_facebook_input" type="text" />
          </div>
        </crux-text-component>
      </div>
    `;
    const in1 = document.getElementById('rec_linkedin_input')!;
    const in2 = document.getElementById('rec_facebook_input')!;

    expect(LabelExtractor.extractLabel(in1)).toBe('LinkedIn');
    expect(LabelExtractor.extractLabel(in2)).toBe('Facebook');
  });
});
