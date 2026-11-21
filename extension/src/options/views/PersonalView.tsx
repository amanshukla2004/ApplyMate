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
    <div className="view" id="v-personal">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Personal details</h2>
          {(isMissing(personal.firstName) || isMissing(personal.email) || isMissing(phoneNumberOnly)) && (
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

        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="fn">
              First name
              {isMissing(personal.firstName) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Required</span>
              )}
            </label>
            <input
              className="in"
              id="fn"
              style={getHighlightStyle(personal.firstName)}
              value={personal.firstName || ''}
              onChange={(e) => onChange('firstName', e.target.value)}
              placeholder="e.g. Aman"
            />
          </div>

          <div>
            <label className="f" htmlFor="ln">
              Last name
              {isMissing(personal.lastName) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Required</span>
              )}
            </label>
            <input
              className="in"
              id="ln"
              style={getHighlightStyle(personal.lastName)}
              value={personal.lastName || ''}
              onChange={(e) => onChange('lastName', e.target.value)}
              placeholder="e.g. Shukla"
            />
          </div>

          <div>
            <label className="f" htmlFor="em">
              Email address
              {isMissing(personal.email) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Required</span>
              )}
            </label>
            <input
              className="in"
              id="em"
              type="email"
              style={getHighlightStyle(personal.email)}
              value={personal.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="name@example.com"
            />
            <p className="hint">Used for email fields on every job portal.</p>
          </div>

          <div>
            <label className="f" htmlFor="ph">
              Phone
              {isMissing(phoneNumberOnly) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Needed for applications</span>
              )}
            </label>
            <div className="vrow">
              <select
                className="in"
                style={{ width: '90px', flex: 'none' }}
                aria-label="Country code"
                value={phoneCountryCode}
                onChange={(e) => onCountryCodeChange(e.target.value)}
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+49">+49 (DE)</option>
                <option value="+61">+61 (AU)</option>
                <option value="+65">+65 (SG)</option>
              </select>
              <input
                className="in"
                id="ph"
                style={getHighlightStyle(phoneNumberOnly)}
                value={phoneNumberOnly}
                onChange={(e) => onPhoneNumberChange(e.target.value)}
                placeholder="7983163187"
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
            <label className="f" htmlFor="gen">Gender</label>
            <select
              className="in"
              id="gen"
              value={personal.gender || ''}
              onChange={(e) => onChange('gender', e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label className="f" htmlFor="eeo-race">EEO Race / Ethnicity</label>
            <select
              className="in"
              id="eeo-race"
              value={personal.race || ''}
              onChange={(e) => onChange('race', e.target.value)}
            >
              <option value="">Select or type your own...</option>
              <option value="Asian (Indian / South Asian)">Asian (Indian / South Asian)</option>
              <option value="Asian (East Asian)">Asian (East Asian)</option>
              <option value="White / Caucasian">White / Caucasian</option>
              <option value="Black or African American">Black or African American</option>
              <option value="Hispanic or Latino">Hispanic or Latino</option>
              <option value="Two or More Races">Two or More Races</option>
              <option value="Decline to state">Decline to state</option>
            </select>
            <p className="hint">Choose from standard EEO categories or leave blank.</p>
          </div>
        </form>
      </Card>
    </div>
  );
};
