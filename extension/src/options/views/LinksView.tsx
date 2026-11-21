import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ProfessionalLinks } from '../../types/profile';

export interface LinksViewProps {
  links: ProfessionalLinks;
  onChange: (field: keyof ProfessionalLinks, value: string) => void;
}

export const LinksView: React.FC<LinksViewProps> = ({ links, onChange }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ margin: 0 }}>Professional links</h2>
          {(isMissing(links.linkedInUrl) || isMissing(links.githubUrl)) && (
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
              Missing links need attention
            </span>
          )}
        </div>
        <p className="hint" style={{ margin: '4px 0 16px' }}>
          Mapped to profile URL fields across job portals (Greenhouse, Workday, Lever, Ashby).
        </p>
        <form className="grid2" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label className="f" htmlFor="li">
              LinkedIn profile URL
              {isMissing(links.linkedInUrl) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Essential for tech jobs</span>
              )}
            </label>
            <input
              className="in"
              id="li"
              type="url"
              style={getHighlightStyle(links.linkedInUrl)}
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
            <label className="f" htmlFor="gh">
              GitHub profile URL
              {isMissing(links.githubUrl) && (
                <span style={{ color: '#F59E0B', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>• Recommended for developers</span>
              )}
            </label>
            <input
              className="in"
              id="gh"
              type="url"
              style={getHighlightStyle(links.githubUrl)}
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

          <div style={{ gridColumn: 'span 2' }}>
            <label className="f" htmlFor="po">Portfolio or personal website</label>
            <input
              className="in"
              id="po"
              type="url"
              placeholder="https://yourname.dev"
              value={links.portfolioUrl || ''}
              onChange={(e) => validateUrl('portfolioUrl', e.target.value)}
            />
            {errors.portfolioUrl ? (
              <p className="hint err" role="alert">{errors.portfolioUrl}</p>
            ) : (
              <p className="hint">Optional personal website, blog or portfolio link.</p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
