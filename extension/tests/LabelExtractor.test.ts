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
});
