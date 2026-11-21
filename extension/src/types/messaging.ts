import { ApplicationField } from './canonicalFields';

export interface SelectOption {
  label: string;
  value: string;
}

export type FieldStatus = 'MATCHED' | 'UNMATCHED' | 'NEEDS_REVIEW' | 'UNSUPPORTED';

export interface DetectedField {
  id: string; // Internal stable identifier
  tagName: string; // 'INPUT' | 'TEXTAREA' | 'SELECT'
  fieldType: string; // 'text', 'email', 'radio', etc.
  name?: string;
  elementId?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  autocomplete?: string;
  required: boolean;
  options?: SelectOption[];
  canonicalField?: ApplicationField;
  confidence: number;
  status: FieldStatus;
  proposedValue?: string;
}

export interface FillResult {
  fieldId: string;
  success: boolean;
  message?: string;
  errorCode?: string;
}

export interface WebsiteMetadata {
  url: string;
  hostname: string;
  adapterName: string;
  title: string;
}

export type ExtensionMessage =
  | { type: 'PING' }
  | { type: 'PONG'; version: string }
  | { type: 'SCAN_FORM'; tabId?: number }
  | { type: 'FORM_SCAN_RESULT'; fields: DetectedField[]; website?: WebsiteMetadata }
  | { type: 'FILL_FIELDS'; values: Record<string, string>; tabId?: number }
  | { type: 'FILL_RESULT'; results: FillResult[]; summary: { total: number; success: number; failed: number } }
  | { type: 'GET_ACTIVE_TAB_INFO' }
  | { type: 'ACTIVE_TAB_INFO_RESULT'; tabId?: number; url?: string; title?: string }
  | { type: 'OPEN_SIDE_PANEL' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'RELOAD_ACTIVE_TAB' }
  | { type: 'HIGHLIGHT_FIELD'; fieldId: string; highlight: boolean; tabId?: number }
  | { type: 'GET_USER_PROFILE' }
  | { type: 'WORKDAY_STEP_CHANGED'; data: { stepTitle: string; fields: DetectedField[]; website: WebsiteMetadata } }
  | { type: 'RECORD_APPLICATION'; data: { companyName?: string; jobTitle?: string; jobUrl?: string } };

export type MessageResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
