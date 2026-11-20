import React from 'react';
import { Card } from '../../components/ui/Card';
import { PersonalInfo } from '../../types/profile';

export interface PersonalViewProps {
  personal: PersonalInfo;
  phoneCountryCode: string;
  phoneNumberOnly: string;
  phoneError: string;
  onChange: (field: keyof PersonalInfo, value: string) => void;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (val: string) => void;
}

export const PersonalView: React.FC<PersonalViewProps> = ({
  personal,
  phoneCountryCode,
  phoneNumberOnly,
  phoneError,
  onChange,
  onCountryCodeChange,
  onPhoneNumberChange,
}) => {
  return (
    <div className="view" id="v-personal">
      <Card>
        <h2 style={{ marginBottom: '16px' }}>Personal details</h2>
        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="fn">First name</label>
            <input
              className="in"
              id="fn"
              value={personal.firstName || ''}
              onChange={(e) => onChange('firstName', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="ln">Last name</label>
            <input
              className="in"
              id="ln"
              value={personal.lastName || ''}
              onChange={(e) => onChange('lastName', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="em">Email address</label>
            <input
              className="in"
              id="em"
              type="email"
              value={personal.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
            />
            <p className="hint">Used for email fields on every job portal.</p>
          </div>
          <div>
            <label className="f" htmlFor="ph">Phone</label>
            <div className="vrow">
              <select
                className="in"
                style={{ width: '90px', flex: 'none' }}
                aria-label="Country code"
                value={phoneCountryCode}
                onChange={(e) => onCountryCodeChange(e.target.value)}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+49">+49</option>
                <option value="+971">+971</option>
                <option value="+65">+65</option>
              </select>
              <input
                className="in"
                id="ph"
                value={phoneNumberOnly}
                onChange={(e) => onPhoneNumberChange(e.target.value)}
                placeholder="10-digit number"
              />
            </div>
            {phoneError ? (
              <p className="hint err" role="alert">{phoneError}</p>
            ) : (
              <p className="hint">10 digits without spaces or dashes</p>
            )}
          </div>
          <div>
            <label className="f" htmlFor="dob">Date of birth</label>
            <input
              className="in"
              id="dob"
              type="date"
              value={personal.dateOfBirth || ''}
              onChange={(e) => onChange('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="gn">Gender</label>
            <select
              className="in"
              id="gn"
              value={personal.gender || 'Prefer not to say'}
              onChange={(e) => onChange('gender', e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="f" htmlFor="race">EEO Race / Ethnicity</label>
            <input
              className="in"
              id="race"
              placeholder="e.g. Asian, Hispanic, Two or More Races"
              value={personal.race || ''}
              onChange={(e) => onChange('race', e.target.value)}
            />
            <p className="hint">Optional. Filled only when requested for US Equal Opportunity questions.</p>
          </div>
        </form>
      </Card>
    </div>
  );
};
