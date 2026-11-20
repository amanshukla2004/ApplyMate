import { ApplicationField, CANONICAL_FIELDS } from '../types/canonicalFields';

export interface MatchResult {
  canonicalField?: ApplicationField;
  confidence: number;
}

export class FieldMatcher {
  /**
   * Matches element metadata against canonical fields using multi-stage analysis.
   */
  static match(
    name: string = '',
    id: string = '',
    label: string = '',
    placeholder: string = '',
    autocomplete: string = '',
    ariaLabel: string = ''
  ): MatchResult {
    const normName = this.normalize(name);
    const normId = this.normalize(id);
    const normLabel = this.normalize(label);
    const normPlaceholder = this.normalize(placeholder);
    const normAuto = this.normalize(autocomplete);
    const normAria = this.normalize(ariaLabel);

    let bestField: ApplicationField | undefined = undefined;
    let maxScore = 0;

    for (const [key, def] of Object.entries(CANONICAL_FIELDS)) {
      const field = key as ApplicationField;
      let score = 0;

      // 1. Autocomplete match (High precision when standard)
      if (normAuto) {
        if (field === 'EMAIL' && normAuto === 'email') score = Math.max(score, 0.95);
        if (field === 'PHONE' && (normAuto === 'tel' || normAuto.includes('phone'))) score = Math.max(score, 0.95);
        if (field === 'FULL_NAME' && normAuto === 'name') score = Math.max(score, 0.95);
        if (field === 'FIRST_NAME' && (normAuto === 'given-name' || normAuto === 'fname')) score = Math.max(score, 0.95);
        if (field === 'LAST_NAME' && (normAuto === 'family-name' || normAuto === 'lname')) score = Math.max(score, 0.95);
        if (field === 'ADDRESS' && normAuto.includes('address-line1')) score = Math.max(score, 0.95);
        if (field === 'CITY' && normAuto.includes('address-level2')) score = Math.max(score, 0.95);
        if (field === 'ZIP_CODE' && normAuto.includes('postal-code')) score = Math.max(score, 0.95);
      }

      // Check aliases across attributes
      for (const alias of def.aliases) {
        const normAlias = this.normalize(alias);

        // Exact match on Name
        if (normName === normAlias) {
          score = Math.max(score, 0.90);
        } else if (normName.includes(normAlias) && normAlias.length > 3) {
          score = Math.max(score, 0.75);
        }

        // Exact match on ID
        if (normId === normAlias) {
          score = Math.max(score, 0.85);
        } else if (normId.includes(normAlias) && normAlias.length > 3) {
          score = Math.max(score, 0.70);
        }

        // Exact match on Label
        if (normLabel === normAlias) {
          score = Math.max(score, 0.90);
        } else if (normLabel.includes(normAlias)) {
          score = Math.max(score, 0.80);
        }

        // Aria label
        if (normAria === normAlias) {
          score = Math.max(score, 0.85);
        } else if (normAria.includes(normAlias)) {
          score = Math.max(score, 0.75);
        }

        // Placeholder
        if (normPlaceholder === normAlias) {
          score = Math.max(score, 0.70);
        } else if (normPlaceholder.includes(normAlias)) {
          score = Math.max(score, 0.60);
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestField = field;
      }
    }

    // Thresholds: >= 0.6 is a confident match
    if (maxScore >= 0.6 && bestField) {
      return { canonicalField: bestField, confidence: maxScore };
    }

    return { confidence: maxScore };
  }

  static normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
