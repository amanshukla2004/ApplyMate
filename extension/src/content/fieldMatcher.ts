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

        // Check if field is COLLEGE but the question is actually asking about NOC / permissions / certificates
        if (field === 'COLLEGE') {
          const isNocOrPermission = /(noc|no objection|certificate|letter|permission|permit|allow|able to provide|can your|will your|attendance|duration)/i.test(label);
          if (isNocOrPermission) {
            continue; // Skip COLLEGE match for questions asking about NOC or permissions
          }
        }

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
          score = Math.max(score, 0.95);
        } else if (normLabel.includes(normAlias) && normAlias.length > 3) {
          // For generic single words like "university" or "school", only match if label is short or asks for name
          if (field === 'COLLEGE' && (normAlias === 'university' || normAlias === 'school' || normAlias === 'college')) {
            const isNameQuery = normLabel.includes('name') || normLabel.includes('attending') || normLabel.includes('which') || normLabel.length < 35;
            if (!isNameQuery) {
              continue;
            }
          }

          // For URL fields (PORTFOLIO_URL, LINKEDIN_URL, GITHUB_URL, FACEBOOK_URL, TWITTER_URL), never match long narrative essay questions
          if (field === 'PORTFOLIO_URL' || field === 'LINKEDIN_URL' || field === 'GITHUB_URL' || field === 'FACEBOOK_URL' || field === 'TWITTER_URL') {
            const isNarrativeQuery =
              normLabel.length > 40 ||
              normLabel.includes('tell us') ||
              normLabel.includes('describe') ||
              normLabel.includes('built') ||
              normLabel.includes('problem') ||
              normLabel.includes('impact') ||
              normLabel.includes('numerical') ||
              normLabel.includes('participated') ||
              normLabel.includes('what was') ||
              normLabel.includes('why');
            if (isNarrativeQuery) {
              continue;
            }
          }
          const specificity = Math.min(0.12, normAlias.length / 100);
          score = Math.max(score, 0.80 + specificity);
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
      .replace(/\blinked\s*in\b/g, 'linkedin')
      .replace(/\bface\s*book\b/g, 'facebook')
      .replace(/\bgit\s*hub\b/g, 'github')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
