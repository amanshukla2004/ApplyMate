import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { JobPreferences } from '../../types/profile';

export interface PreferencesViewProps {
  preferences: JobPreferences;
  onChange: <K extends keyof JobPreferences>(field: K, value: JobPreferences[K]) => void;
}

const NOTICE_PICKS = ['Immediate', '15 Days', '30 Days', '60 Days', '90 Days'];
const WORK_MODELS: ('Flexible' | 'Remote' | 'Hybrid' | 'On-site')[] = ['Flexible', 'Remote', 'Hybrid', 'On-site'];

export const PreferencesView: React.FC<PreferencesViewProps> = ({ preferences, onChange }) => {
  const [locationsInput, setLocationsInput] = useState((preferences.preferredLocations || []).join(', '));
  const [titlesInput, setTitlesInput] = useState((preferences.preferredTitles || []).join(', '));

  useEffect(() => {
    setLocationsInput((preferences.preferredLocations || []).join(', '));
  }, [preferences.preferredLocations]);

  useEffect(() => {
    setTitlesInput((preferences.preferredTitles || []).join(', '));
  }, [preferences.preferredTitles]);
  return (
    <div className="view" id="v-prefs">
      <Card>
        <h2>Employment preferences</h2>
        <p className="hint" style={{ margin: '4px 0 16px' }}>
          Fills notice, salary, location, and visa authorization questions on applications.
        </p>

        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="np">Notice period</label>
            <input
              className="in"
              id="np"
              placeholder="e.g. 30 Days"
              value={preferences.noticePeriodDays || ''}
              onChange={(e) => onChange('noticePeriodDays', e.target.value)}
            />
            <p className="hint">Pick a quick option below or type your own.</p>
          </div>

          <div>
            <p className="f">Quick picks</p>
            <div className="row" style={{ marginTop: '4px' }}>
              {NOTICE_PICKS.map((pick) => (
                <Chip
                  key={pick}
                  active={preferences.noticePeriodDays === pick}
                  onClick={() => onChange('noticePeriodDays', pick)}
                >
                  {pick}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="f" htmlFor="ec">Expected compensation</label>
            <input
              className="in"
              id="ec"
              placeholder="e.g. 18 LPA or $120,000"
              value={preferences.expectedCompensation || ''}
              onChange={(e) => onChange('expectedCompensation', e.target.value)}
            />
          </div>

          <div>
            <label className="f" htmlFor="cc">Current compensation</label>
            <input
              className="in"
              id="cc"
              placeholder="e.g. 12 LPA or $95,000"
              value={preferences.currentCompensation || ''}
              onChange={(e) => onChange('currentCompensation', e.target.value)}
            />
          </div>

          <div>
            <p className="f" id="wm-label">Workplace preference</p>
            <div className="choice" role="group" aria-labelledby="wm-label">
              {WORK_MODELS.map((model) => (
                <button
                  key={model}
                  type="button"
                  aria-pressed={preferences.workModel === model}
                  onClick={() => onChange('workModel', model)}
                >
                  {model}
                </button>
              ))}
            </div>
            <p className="hint">Fills workplace model questions (Remote / Hybrid / On-site).</p>
          </div>

          <div>
            <label className="f" htmlFor="pref-loc">Preferred workplace locations</label>
            <input
              className="in"
              id="pref-loc"
              placeholder="e.g. Bengaluru, Remote, San Francisco"
              value={locationsInput}
              onChange={(e) => {
                const val = e.target.value;
                setLocationsInput(val);
                const parsed = val.split(',').map((s) => s.trim()).filter(Boolean);
                onChange('preferredLocations', parsed);
              }}
              onBlur={() => {
                const parsed = locationsInput.split(',').map((s) => s.trim()).filter(Boolean);
                setLocationsInput(parsed.join(', '));
                onChange('preferredLocations', parsed);
              }}
            />
            <p className="hint">Comma-separated target cities or countries.</p>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="f" htmlFor="pref-titles">Target job titles</label>
            <input
              className="in"
              id="pref-titles"
              placeholder="e.g. Software Engineer, Full Stack Developer, Frontend Engineer"
              value={titlesInput}
              onChange={(e) => {
                const val = e.target.value;
                setTitlesInput(val);
                const parsed = val.split(',').map((s) => s.trim()).filter(Boolean);
                onChange('preferredTitles', parsed);
              }}
              onBlur={() => {
                const parsed = titlesInput.split(',').map((s) => s.trim()).filter(Boolean);
                setTitlesInput(parsed.join(', '));
                onChange('preferredTitles', parsed);
              }}
            />
            <p className="hint">Comma-separated job roles you are actively targeting.</p>
          </div>

          <div>
            <p className="f" id="rl-label">Open to relocation</p>
            <div className="choice" role="group" aria-labelledby="rl-label">
              <button
                type="button"
                aria-pressed={preferences.willingToRelocate === true}
                onClick={() => onChange('willingToRelocate', true)}
              >
                Yes
              </button>
              <button
                type="button"
                aria-pressed={preferences.willingToRelocate === false}
                onClick={() => onChange('willingToRelocate', false)}
              >
                No
              </button>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="f" htmlFor="wa">Work authorization</label>
            <select
              className="in"
              id="wa"
              value={preferences.workAuthorizationStatus || 'Authorized to work in India'}
              onChange={(e) => onChange('workAuthorizationStatus', e.target.value)}
            >
              <option value="Authorized to work in India">Authorized to work in India</option>
              <option value="Authorized to work in US (Citizen / Green Card)">
                Authorized to work in US (Citizen / Green Card)
              </option>
              <option value="Requires visa sponsorship (H-1B, etc.)">
                Requires visa sponsorship (H-1B, etc.)
              </option>
              <option value="Citizen or permanent resident">Citizen or permanent resident</option>
            </select>
          </div>
        </form>
      </Card>
    </div>
  );
};
