# Low-Level Design (LLD): JobMate / ApplyMate

## 1. Canonical Field System

JobMate standardizes form fields into a unified schema defined in `src/types/canonicalFields.ts`.

### Canonical Field Taxonomy:
- **Personal**: `FIRST_NAME`, `LAST_NAME`, `FULL_NAME`, `GENDER`
- **Contact**: `EMAIL`, `PHONE`
- **Address**: `ADDRESS`, `ADDRESS_LINE_2`, `CITY`, `STATE`, `COUNTRY`, `ZIP_CODE`
- **Professional Links**: `LINKEDIN_URL`, `GITHUB_URL`, `PORTFOLIO_URL`
- **Education**: `COLLEGE`, `DEGREE`, `BRANCH`, `CGPA`, `GRADUATION_YEAR`
- **Experience**: `EXPERIENCE`, `SKILLS`
- **Preferences**: `NOTICE_PERIOD`, `CURRENT_CTC`, `EXPECTED_CTC`, `WORK_AUTHORIZATION`, `RELOCATION`
- **Documents**: `RESUME`, `COVER_LETTER`

Each field contains pre-compiled aliases, data types, and sensitivity indicators.

---

## 2. Field Matching Algorithm

Matching follows a 4-stage pipeline:
1. **Autocomplete Attribute Matching**: Standard tokens (`email`, `tel`, `given-name`, `family-name`) yield high confidence (0.95).
2. **Exact Identifier Matching**: Comparing normalized `name` and `id` attributes against alias tables.
3. **Label and Metadata Matching**: Evaluates associated `<label>` text, `aria-label`, and `placeholder`.
4. **Weighted Confidence Scoring**:
   - $\ge 0.75$: `MATCHED` (auto-selected for autofill)
   - $0.60 - 0.74$: `NEEDS_REVIEW` (suggested value flagged for user confirmation)
   - $< 0.60$: `UNMATCHED`

---

## 3. Autofill Engine Architecture

To support React, Vue, Angular, and standard HTML forms:
- Uses `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set` to avoid breaking framework state hooks.
- Dispatches synthetic events:
  ```ts
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
  ```
- Handles `<select>` via case-insensitive value and text matching.
- Handles checkboxes and radio buttons with `.click()` and change events.
- In-memory element registry prevents DOM node serialization across Chrome IPC channels.

---

## 4. Website Adapter Architecture

Adapters implement the `FormAdapter` interface:
```typescript
interface FormAdapter {
  readonly name: string;
  isSupported(url: string, document: Document): boolean;
  scanForm(): Promise<DetectedField[]>;
  fillField(fieldId: string, value: string): Promise<FillResult>;
  fillFields(values: Record<string, string>): Promise<FillResult[]>;
  getMetadata(): WebsiteMetadata;
}
```

Implementations:
- `GenericAdapter`: Fallback engine for standard web forms.
- `GreenhouseAdapter`: Custom selectors for Greenhouse forms.
- `LeverAdapter`: Specialized for Lever `.application-form` and social links.
- `WorkdayAdapter`: Targets `data-automation-id` attributes.
- `LinkedInAdapter`: Targets LinkedIn Easy Apply modals.
