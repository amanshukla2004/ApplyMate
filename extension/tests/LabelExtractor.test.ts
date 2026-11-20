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
});
