import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
// @ts-ignore
import { JSDOM } from 'jsdom';
import { LabelExtractor } from '../src/content/labelExtractor';
import { ZohoRecruitAdapter } from '../src/adapters/zohorecruit/ZohoRecruitAdapter';

describe('Zoho Recruit User Dump Test', () => {
  it('extracts labels and scans fields from user dump without dropdown search pollution', async () => {
    const fixturePath = resolve(__dirname, './fixtures/user_dump.html');
    const scratchPath = resolve(__dirname, '../../scratch/user_dump.html');
    const htmlPath = existsSync(fixturePath) ? fixturePath : scratchPath;
    const html = readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'https://citygreens.zohorecruit.in/jobs/Careers/120768000006381240' });
    const doc = dom.window.document;

    // Append the mobile text input that was truncated in user's prompt
    const phoneComp = doc.querySelector('crux-phone-component');
    if (phoneComp) {
      const input = doc.createElement('input');
      input.type = 'text';
      input.name = 'rec-form_120768000000345221';
      input.className = 'cxBorderBottom';
      phoneComp.appendChild(input);
    }

    // Set globals
    (global as any).document = doc;
    (global as any).window = dom.window;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).HTMLInputElement = dom.window.HTMLInputElement;
    (global as any).HTMLSelectElement = dom.window.HTMLSelectElement;
    (global as any).HTMLTextAreaElement = dom.window.HTMLTextAreaElement;

    const input1 = doc.querySelector('input[name="rec-form_120768000000345215"]') as HTMLElement;
    expect(input1).toBeTruthy();

    const label1 = LabelExtractor.extractLabel(input1);
    expect(label1).toBe('First Name');

    const adapter = new ZohoRecruitAdapter();
    const isSupp = adapter.isSupported('https://citygreens.zohorecruit.in/jobs/Careers/120768000006381240', doc);
    expect(isSupp).toBe(true);

    const fields = await adapter.scanForm();
    const fieldMap = Object.fromEntries(fields.map(f => [f.canonicalField, f]));

    expect(fieldMap['FIRST_NAME']).toBeDefined();
    expect(fieldMap['FIRST_NAME'].label).toBe('First Name');

    expect(fieldMap['LAST_NAME']).toBeDefined();
    expect(fieldMap['LAST_NAME'].label).toBe('Last Name');

    expect(fieldMap['EMAIL']).toBeDefined();
    expect(fieldMap['EMAIL'].label).toBe('Email');

    expect(fieldMap['PHONE']).toBeDefined();
    expect(fieldMap['PHONE'].label).toBe('Mobile');

    // Search country with dial code should NOT be scanned as a field
    const dialCodeSearch = fields.find(f => f.label?.includes('Search country with dial code'));
    expect(dialCodeSearch).toBeUndefined();
  });
});
