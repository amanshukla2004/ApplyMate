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
});
