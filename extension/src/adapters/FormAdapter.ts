import { DetectedField, FillResult, WebsiteMetadata } from '../types/messaging';

export interface FormAdapter {
  readonly name: string;

  /**
   * Evaluates if this adapter matches the current page URL or DOM characteristics.
   */
  isSupported(url: string, document: Document): boolean;

  /**
   * Scans the form fields on the current page.
   */
  scanForm(): Promise<DetectedField[]>;

  /**
   * Populates a single detected field.
   */
  fillField(fieldId: string, value: string): Promise<FillResult>;

  /**
   * Populates multiple detected fields.
   */
  fillFields(values: Record<string, string>): Promise<FillResult[]>;

  /**
   * Returns metadata regarding the detected portal.
   */
  getMetadata(): WebsiteMetadata;
}
