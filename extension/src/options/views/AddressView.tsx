import React from 'react';
import { Card } from '../../components/ui/Card';
import { AddressInfo } from '../../types/profile';

export interface AddressViewProps {
  address: AddressInfo;
  onChange: (field: keyof AddressInfo, value: string) => void;
}

export const AddressView: React.FC<AddressViewProps> = ({ address, onChange }) => {
  return (
    <div className="view" id="v-address">
      <Card>
        <h2>Address details</h2>
        <p className="hint" style={{ margin: '4px 0 16px' }}>
          Matched against address fields on any job application form.
        </p>
        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="a1">Street address, line 1</label>
            <input
              className="in"
              id="a1"
              value={address.addressLine1 || ''}
              onChange={(e) => onChange('addressLine1', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="a2">Street address, line 2</label>
            <input
              className="in"
              id="a2"
              value={address.addressLine2 || ''}
              onChange={(e) => onChange('addressLine2', e.target.value)}
            />
            <p className="hint">Apartment, suite, unit or floor (optional)</p>
          </div>
          <div>
            <label className="f" htmlFor="ci">City</label>
            <input
              className="in"
              id="ci"
              value={address.city || ''}
              onChange={(e) => onChange('city', e.target.value)}
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
            />
            <datalist id="state-list">
              <option value="Uttar Pradesh" />
              <option value="Karnataka" />
              <option value="Maharashtra" />
              <option value="Delhi" />
              <option value="Telangana" />
              <option value="California" />
              <option value="New York" />
              <option value="Texas" />
            </datalist>
          </div>
          <div>
            <label className="f" htmlFor="zip">Postal / Zip code</label>
            <input
              className="in"
              id="zip"
              value={address.postalCode || ''}
              onChange={(e) => onChange('postalCode', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="cty">Country</label>
            <input
              className="in"
              id="cty"
              list="country-list"
              value={address.country || ''}
              onChange={(e) => onChange('country', e.target.value)}
            />
            <datalist id="country-list">
              <option value="India" />
              <option value="United States" />
              <option value="United Kingdom" />
              <option value="Canada" />
              <option value="Germany" />
              <option value="Australia" />
              <option value="Singapore" />
            </datalist>
          </div>
        </form>
      </Card>
    </div>
  );
};
