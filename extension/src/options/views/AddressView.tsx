import React from 'react';
import { Card } from '../../components/ui/Card';
import { AddressInfo } from '../../types/profile';

export interface AddressViewProps {
  address: AddressInfo;
  onChange: (field: keyof AddressInfo, value: string) => void;
}

export const AddressView: React.FC<AddressViewProps> = ({ address, onChange }) => {
  const isMissing = (val?: string) => !val || val.trim() === '';

  const getHighlightStyle = (val?: string) => {
    if (isMissing(val)) {
      return {
        borderColor: '#F59E0B',
        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.15)',
        background: 'rgba(245, 158, 11, 0.02)',
      };
    }
    return undefined;
  };

  return (
    <div className="view" id="v-address">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ margin: 0 }}>Address details</h2>
          {(isMissing(address.addressLine1) || isMissing(address.city) || isMissing(address.country)) && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#D97706',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '3px 8px',
                borderRadius: '99px',
              }}
            >
              Highlighted fields need review
            </span>
          )}
        </div>
        <p className="hint" style={{ margin: '4px 0 16px' }}>
          Matched against address fields on any job application form. Resumes often omit full street addresses, so please verify.
        </p>
        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="a1">
              Street address, line 1
              {isMissing(address.addressLine1) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Needs review</span>
              )}
            </label>
            <input
              className="in"
              id="a1"
              style={getHighlightStyle(address.addressLine1)}
              value={address.addressLine1 || ''}
              onChange={(e) => onChange('addressLine1', e.target.value)}
              placeholder="e.g. 123 Tech Park Road"
            />
          </div>

          <div>
            <label className="f" htmlFor="a2">Street address, line 2</label>
            <input
              className="in"
              id="a2"
              value={address.addressLine2 || ''}
              onChange={(e) => onChange('addressLine2', e.target.value)}
              placeholder="Apartment, suite, unit or floor (optional)"
            />
          </div>

          <div>
            <label className="f" htmlFor="ci">
              City
              {isMissing(address.city) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Required</span>
              )}
            </label>
            <input
              className="in"
              id="ci"
              style={getHighlightStyle(address.city)}
              value={address.city || ''}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="e.g. Noida / San Francisco"
            />
          </div>

          <div>
            <label className="f" htmlFor="sta">State / Province</label>
            <input
              className="in"
              id="sta"
              list="state-list"
              value={address.state || ''}
              onChange={(e) => onChange('state', e.target.value)}
              placeholder="e.g. Uttar Pradesh / California"
            />
            <datalist id="state-list">
              <option value="Uttar Pradesh" />
              <option value="Karnataka" />
              <option value="Maharashtra" />
              <option value="Delhi" />
              <option value="California" />
              <option value="New York" />
              <option value="Texas" />
              <option value="Washington" />
            </datalist>
          </div>

          <div>
            <label className="f" htmlFor="pc">Postal / Zip code</label>
            <input
              className="in"
              id="pc"
              value={address.postalCode || ''}
              onChange={(e) => onChange('postalCode', e.target.value)}
              placeholder="e.g. 201301 / 94107"
            />
          </div>

          <div>
            <label className="f" htmlFor="co">
              Country
              {isMissing(address.country) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Required</span>
              )}
            </label>
            <input
              className="in"
              id="co"
              style={getHighlightStyle(address.country)}
              value={address.country || ''}
              onChange={(e) => onChange('country', e.target.value)}
              placeholder="e.g. India / United States"
            />
          </div>
        </form>
      </Card>
    </div>
  );
};
