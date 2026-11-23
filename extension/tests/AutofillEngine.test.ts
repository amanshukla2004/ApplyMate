import { describe, it, expect, beforeEach } from 'vitest';
import { domScanner } from '../src/content/domScanner';
import { autofillEngine } from '../src/content/autofillEngine';

describe('AutofillEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="job-app">
        <label for="fname">First Name</label>
        <input id="fname" name="firstName" type="text" />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" />

        <label for="role-select">Role Level</label>
        <select id="role-select" name="role">
          <option value="">Select Level</option>
          <option value="junior">Junior Developer</option>
          <option value="senior">Senior Engineer</option>
        </select>

        <label for="work-auth">Authorized to work</label>
        <input id="work-auth" type="checkbox" name="workAuth" />
      </form>
    `;
  });

  it('scans DOM and autofills text inputs with change events triggered', async () => {
    const detected = domScanner.scan();
    expect(detected.length).toBe(4);

    const firstNameField = detected.find((f) => f.elementId === 'fname')!;
    expect(firstNameField).toBeDefined();

    let inputEventFired = false;
    let changeEventFired = false;
    const inputEl = document.getElementById('fname') as HTMLInputElement;

    inputEl.addEventListener('input', () => {
      inputEventFired = true;
    });
    inputEl.addEventListener('change', () => {
      changeEventFired = true;
    });

    const result = await autofillEngine.fillField(firstNameField.id, 'Alexander');

    expect(result.success).toBe(true);
    expect(inputEl.value).toBe('Alexander');
    expect(inputEventFired).toBe(true);
    expect(changeEventFired).toBe(true);
  });

  it('autofills select dropdown by text option match', async () => {
    const detected = domScanner.scan();
    const selectField = detected.find((f) => f.elementId === 'role-select')!;

    const selectEl = document.getElementById('role-select') as HTMLSelectElement;
    const result = await autofillEngine.fillField(selectField.id, 'Senior Engineer');

    expect(result.success).toBe(true);
    expect(selectEl.value).toBe('senior');
  });

  it('autofills checkbox appropriately', async () => {
    const detected = domScanner.scan();
    const checkboxField = detected.find((f) => f.elementId === 'work-auth')!;

    const checkEl = document.getElementById('work-auth') as HTMLInputElement;
    expect(checkEl.checked).toBe(false);

    await autofillEngine.fillField(checkboxField.id, 'true');
    expect(checkEl.checked).toBe(true);
  });

  it('autofills mobile phone with separate country code dropdown and strips country code from text input', async () => {
    document.body.innerHTML = `
      <form id="phone-app">
        <label for="phone_input">Mobile Phone *</label>
        <div class="input-group">
          <select id="country_code_select" name="countryCode">
            <option value="">Select</option>
            <option value="+1">United States (+1)</option>
            <option value="+91">India (+91)</option>
            <option value="+44">United Kingdom (+44)</option>
          </select>
          <input id="phone_input" name="mobilePhone" type="tel" />
        </div>
      </form>
    `;

    const detected = domScanner.scan();
    expect(detected.length).toBe(2);

    const selectField = detected.find((f) => f.elementId === 'country_code_select')!;
    const inputField = detected.find((f) => f.elementId === 'phone_input')!;

    // Test filling country code select
    const selectEl = document.getElementById('country_code_select') as HTMLSelectElement;
    await autofillEngine.fillField(selectField.id, '+91');
    expect(selectEl.value).toBe('+91');

    // Test filling phone text input: should strip +91 leaving 10-digit national number
    const inputEl = document.getElementById('phone_input') as HTMLInputElement;
    await autofillEngine.fillField(inputField.id, '+917983163187');
    expect(inputEl.value).toBe('7983163187');
  });

  it('autofills mobile phone device type dropdown when presented with Mobile/Home/Work options', async () => {
    document.body.innerHTML = `
      <form id="device-app">
        <label for="device_type">Phone Device Type</label>
        <select id="device_type" name="phoneType">
          <option value="">Select</option>
          <option value="home">Home</option>
          <option value="mobile">Mobile</option>
          <option value="work">Work</option>
        </select>
      </form>
    `;

    const detected = domScanner.scan();
    const selectField = detected.find((f) => f.elementId === 'device_type')!;

    const selectEl = document.getElementById('device_type') as HTMLSelectElement;
    await autofillEngine.fillField(selectField.id, 'Mobile');
    expect(selectEl.value).toBe('mobile');
  });

  it('autofills radio group correctly selecting positive option and not toggling opposite option', async () => {
    document.body.innerHTML = `
      <form id="radio-app">
        <label>Are you authorized to work?</label>
        <input id="radio_yes" type="radio" name="authorized" value="yes" />
        <input id="radio_no" type="radio" name="authorized" value="no" />
      </form>
    `;

    const detected = domScanner.scan();
    const yesField = detected.find((f) => f.elementId === 'radio_yes')!;
    const noField = detected.find((f) => f.elementId === 'radio_no')!;

    const yesEl = document.getElementById('radio_yes') as HTMLInputElement;
    const noEl = document.getElementById('radio_no') as HTMLInputElement;

    await autofillEngine.fillField(yesField.id, 'yes');
    expect(yesEl.checked).toBe(true);
    expect(noEl.checked).toBe(false);

    // If filling with 'no', it should select the 'no' option
    await autofillEngine.fillField(noField.id, 'no');
    expect(noEl.checked).toBe(true);
    expect(yesEl.checked).toBe(false);
  });
});
