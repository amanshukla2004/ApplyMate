import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ProfessionalLinks } from '../../types/profile';

export interface LinksViewProps {
  links: ProfessionalLinks;
  onChange: (field: keyof ProfessionalLinks, value: string) => void;
}

export const LinksView: React.FC<LinksViewProps> = ({ links, onChange }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateUrl = (field: keyof ProfessionalLinks, value: string) => {
    onChange(field, value);
    if (value && !/^https?:\/\/\S+\.\S+/.test(value.trim())) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Start with https:// and use a full web address.',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="view" id="v-links">
      <Card>
        <h2>Professional links</h2>
        <p className="hint" style={{ margin: '4px 0 16px' }}>
          Mapped to profile URL fields across job portals.
        </p>
        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="li">LinkedIn profile URL</label>
            <input
              className="in"
              id="li"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={links.linkedInUrl || ''}
              onChange={(e) => validateUrl('linkedInUrl', e.target.value)}
            />
            {errors.linkedInUrl ? (
              <p className="hint err" role="alert">{errors.linkedInUrl}</p>
            ) : (
              <p className="hint">Your public LinkedIn profile address.</p>
            )}
          </div>

          <div>
            <label className="f" htmlFor="gh">GitHub profile URL</label>
            <input
              className="in"
              id="gh"
              type="url"
              placeholder="https://github.com/username"
              value={links.githubUrl || ''}
              onChange={(e) => validateUrl('githubUrl', e.target.value)}
            />
            {errors.githubUrl ? (
              <p className="hint err" role="alert">{errors.githubUrl}</p>
            ) : (
              <p className="hint">Your public GitHub developer profile address.</p>
            )}
          </div>

          <div>
            <label className="f" htmlFor="pw">Portfolio or personal website</label>
            <input
              className="in"
              id="pw"
              type="url"
              placeholder="https://yourname.dev"
              value={links.portfolioUrl || ''}
              onChange={(e) => validateUrl('portfolioUrl', e.target.value)}
            />
            {errors.portfolioUrl ? (
              <p className="hint err" role="alert">{errors.portfolioUrl}</p>
            ) : (
              <p className="hint">Optional personal website or portfolio link.</p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
