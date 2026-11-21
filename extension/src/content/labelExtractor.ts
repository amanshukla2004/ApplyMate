export class LabelExtractor {
  /**
   * Extracts the most accurate human-readable label for a given form element.
   */
  static extractLabel(element: HTMLElement): string {
    // 1. Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      const cleaned = this.cleanLabel(ariaLabel);
      if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
        return cleaned;
      }
    }

    // 1b. Check direct attributes commonly used in ATS (Zoho Recruit, Workday, etc.)
    const directAttr =
      element.getAttribute('fieldlabel') ||
      element.getAttribute('data-label') ||
      element.getAttribute('data-fieldname') ||
      element.getAttribute('data-field-name') ||
      element.getAttribute('data-zc-field') ||
      element.getAttribute('cx-prop-label') ||
      element.getAttribute('title');
    if (directAttr && directAttr.trim()) {
      const cleaned = this.cleanLabel(directAttr);
      if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
        return cleaned;
      }
    }

    // 1c. Check Zoho Recruit / Lyte Web Component wrapper attributes (crux-text-component, crux-phone-component, etc.)
    const cruxComp = element.closest(
      '[cx-prop-label], [data-zcqa], [cx-prop-zcqa], crux-text-component, crux-phone-component, crux-email-component, crux-picklist-component'
    );
    if (cruxComp) {
      const cxLabel = cruxComp.getAttribute('cx-prop-label');
      if (cxLabel && !this.isInvalidPlaceholder(cxLabel)) {
        return this.cleanLabel(cxLabel);
      }
      const zcqa = cruxComp.getAttribute('data-zcqa') || cruxComp.getAttribute('cx-prop-zcqa');
      if (zcqa) {
        const cleaned = this.cleanLabel(this.formatIdentifier(zcqa.replace(/^(rec_|manual_)/i, '').replace(/_[scd]$/i, '')));
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 2. Check aria-labelledby (handles single ID or multiple space-separated IDs like in Google Forms)
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
      const parts = ids
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        const cleaned = this.cleanLabel(parts.join(' '));
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 2b. Check Google Forms and ATS question container (role="listitem", .Qr7Oae, .geS5n, etc.)
    const formItem = element.closest(
      '[role="listitem"], .Qr7Oae, .geS5n, [data-item-id], .freebirdFormviewerViewNumberedItemContainer, .freebirdFormviewerViewItemsItemItem'
    );
    if (formItem) {
      const heading = formItem.querySelector(
        '[role="heading"], .M7eMe, .FwR7Pc, .HoGqGc, .freebirdFormviewerViewItemsItemItemTitle, [aria-level="3"]'
      );
      if (heading && heading.textContent && heading.textContent.trim()) {
        const cleaned = this.cleanLabel(heading.textContent);
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 3. Check <label for="elementId">
    if (element.id) {
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(element.id) : element.id.replace(/["\\]/g, '\\$&');
      const explicitLabel = document.querySelector(`label[for="${escapedId}"]`);
      if (explicitLabel && explicitLabel.textContent) {
        const cleaned = this.cleanLabel(explicitLabel.textContent);
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 4. Check enclosing <label> element
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach((inp) => inp.remove());
      if (clone.textContent && clone.textContent.trim()) {
        const cleaned = this.cleanLabel(clone.textContent);
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 5. Robust hierarchical ancestor search (handles nested wrappers in Zoho Recruit, Greenhouse, Workday, Lever, Ashby)
    let current: HTMLElement | null = element.parentElement;
    let depth = 0;
    while (current && depth < 10 && current.tagName !== 'FORM' && current.tagName !== 'BODY') {
      // 5a. Check explicit label child inside current ancestor FIRST
      const labelChild = current.querySelector<HTMLElement>(
        'label, .crm-from-label, .crc-label-text, .crc-form-label, [id*="crc-label"], .rec-label, .label, .field-label, legend, [data-automation-id*="label"], [class*="label"], [class*="lbl"], [class*="title"], [class*="prompt"], [class*="question"], [class*="name"], th'
      );
      if (labelChild) {
        const forAttr = labelChild.getAttribute('for');
        if (!forAttr || !element.id || forAttr === element.id) {
          const otherInputs = labelChild.querySelectorAll('input, select, textarea');
          if (otherInputs.length === 0 || labelChild.contains(element)) {
            const cleaned = this.cleanLabel(labelChild.textContent || '');
            if (cleaned && cleaned.length < 300 && !this.isInvalidPlaceholder(cleaned)) {
              return cleaned;
            }
          }
        }
      }

      // 5b. Check preceding siblings of current wrapper (only if current container is NOT a top-level field row)
      const isTopLevelFieldRow =
        current.classList.contains('field') ||
        current.classList.contains('form-group') ||
        current.classList.contains('form-row') ||
        current.classList.contains('crc-form-row') ||
        current.classList.contains('crc-form-field') ||
        current.className.includes('crc-rec-form') ||
        current.classList.contains('rec-field-row') ||
        current.classList.contains('rec-form-row') ||
        current.hasAttribute('data-field-name') ||
        current.getAttribute('role') === 'listitem';

      if (!isTopLevelFieldRow) {
        let prev = current.previousElementSibling;
        while (prev) {
          const cand = prev.querySelector(
            'label, [class*="label"], [class*="lbl"], [class*="title"], [class*="name"], [class*="prompt"], [class*="head"], [class*="question"], legend, th'
          );
          const text = cand?.textContent || (['LABEL', 'SPAN', 'DIV', 'P', 'TH', 'TD'].includes(prev.tagName) ? prev.textContent : null);
          if (text && text.trim().length > 0 && text.trim().length < 300) {
            const cleaned = this.cleanLabel(text);
            if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
              return cleaned;
            }
          }
          prev = prev.previousElementSibling;
        }
      }

      // 5c. Check data attributes on container
      const dataLabel =
        current.getAttribute('data-field-name') ||
        current.getAttribute('data-label') ||
        current.getAttribute('data-fieldname') ||
        current.getAttribute('data-name') ||
        current.getAttribute('data-title');
      if (dataLabel) {
        const cleanedData = this.cleanLabel(this.formatIdentifier(dataLabel));
        if (cleanedData && !this.isInvalidPlaceholder(cleanedData)) {
          return cleanedData;
        }
      }

      current = current.parentElement;
      depth++;
    }

    // 6. Check placeholder attribute
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      const cleaned = this.cleanLabel(placeholder);
      if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
        return cleaned;
      }
    }

    // 7. Check preceding sibling on element itself
    const previousSibling = element.previousElementSibling;
    if (previousSibling && (previousSibling.tagName === 'LABEL' || previousSibling.tagName === 'SPAN' || previousSibling.tagName === 'DIV' || previousSibling.tagName === 'P')) {
      const text = previousSibling.querySelector('label, [class*="label"], [class*="lbl"]')?.textContent || previousSibling.textContent;
      if (text && text.trim().length < 300) {
        const cleaned = this.cleanLabel(text);
        if (cleaned && !this.isInvalidPlaceholder(cleaned)) {
          return cleaned;
        }
      }
    }

    // 8. Fallback to name or id attribute ONLY if it is not an internal technical hash or placeholder
    const name = element.getAttribute('name');
    if (name && !this.isInvalidPlaceholder(name)) {
      const formatted = this.formatIdentifier(name);
      if (!this.isInvalidPlaceholder(formatted)) {
        return formatted;
      }
    }

    const id = element.getAttribute('id');
    if (id && !this.isInvalidPlaceholder(id)) {
      const formatted = this.formatIdentifier(id);
      if (!this.isInvalidPlaceholder(formatted)) {
        return formatted;
      }
    }

    return '';
  }

  static cleanLabel(raw: string): string {
    let text = raw.replace(/[\n\r\t]+/g, ' ').trim();
    let prev = '';
    while (text !== prev) {
      prev = text;
      text = text
        .replace(/\s*\(\?\)\s*$/, '') // remove trailing (?) tooltip help icon
        .replace(/\s*\*+\s*$/, '') // remove trailing required asterisk
        .replace(/\s*:\s*$/, '') // remove trailing colon
        .replace(/\s*\(optional\)\s*$/gi, '')
        .replace(/\s*\(required\)\s*$/gi, '')
        .replace(/\s+[scd]$/i, '') // strip trailing technical single-letter type suffix (e.g. "Linked In S" -> "Linked In")
        .trim();
    }
    // Normalize standalone brand labels
    if (/^linked\s*in(\s+(url|profile|link|id))?$/i.test(text)) {
      text = 'LinkedIn';
    } else if (/^face\s*book(\s+(url|profile|link|id))?$/i.test(text)) {
      text = 'Facebook';
    } else if (/^git\s*hub(\s+(url|profile|link|id))?$/i.test(text)) {
      text = 'GitHub';
    }

    return text;
  }

  static isInvalidPlaceholder(label: string): boolean {
    const norm = label.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!norm) return true;

    // Filter internal system hashes, form IDs, and technical prefixes (e.g. rec_form_40797000000003149)
    if (/^rec[_\s-]?form\b/i.test(norm)) return true;
    if (/\brec[_\s-]?form\b/i.test(norm)) return true;
    if (/\b\d{5,}\b/.test(norm)) return true; // Any sequence of 5 or more consecutive numbers
    if (/^field\s*#?\d+$/i.test(norm)) return true;
    if (/^input[_\s-]?\d+$/i.test(norm)) return true;
    if (/^customfield\d+$/i.test(norm)) return true;

    const invalidKeywords = [
      'select',
      'select an option',
      'please select',
      'please select an option',
      'choose',
      'choose an option',
      'attach',
      'enter manually',
      'dropbox',
      'google drive',
      'locate me',
      'add another',
      'upload',
      'browse',
      'none',
      'clear',
      'drag and drop',
      'accepted file types',
      'optional',
      'required',
    ];
    if (invalidKeywords.includes(norm)) return true;
    if (/^select\b/.test(norm) && norm.length < 15) return true;
    return false;
  }

  static formatIdentifier(identifier: string): string {
    const stripped = identifier.replace(/_(s|c|d)$/i, '');
    return stripped
      .replace(/[-_.]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\s+[scd]$/i, '')
      .replace(/\blinked\s*in\b/gi, 'LinkedIn')
      .replace(/\bface\s*book\b/gi, 'Facebook')
      .replace(/\bgit\s*hub\b/gi, 'GitHub')
      .trim();
  }
}
