import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ProfessionalLinks, CustomLinkItem } from '../../types/profile';
import {
  Globe,
  Code,
  Palette,
  Share2,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';

export interface LinksViewProps {
  links: ProfessionalLinks;
  onChange: (field: keyof ProfessionalLinks, value: any) => void;
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
    if (value && value.trim() !== '' && !/^https?:\/\/\S+\.\S+/.test(value.trim())) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Start with https:// and enter a complete web address.',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Custom links handlers
  const customLinks: CustomLinkItem[] = links.otherLinks || [];

  const handleAddCustomLink = (presetLabel?: string) => {
    const newItem: CustomLinkItem = {
      id: 'custom-' + Date.now(),
      label: presetLabel || '',
      url: '',
    };
    onChange('otherLinks', [...customLinks, newItem]);
  };

  const handleUpdateCustomLink = (index: number, key: 'label' | 'url', val: string) => {
    const updated = [...customLinks];
    updated[index] = { ...updated[index], [key]: val };
    onChange('otherLinks', updated);
  };

  const handleRemoveCustomLink = (index: number) => {
    const updated = customLinks.filter((_, i) => i !== index);
    onChange('otherLinks', updated);
  };

  const renderUrlField = (
    field: keyof ProfessionalLinks,
    label: string,
    placeholder: string,
    description: string,
    requiredHighlight = false,
    badgeText?: string
  ) => {
    const val = (links[field] as string) || '';
    const err = errors[field as string];
    const missing = requiredHighlight && isMissing(val);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="f" htmlFor={`field-${field}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{label}</span>
            {badgeText && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: missing ? '#D97706' : '#10B981',
                  background: missing ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {badgeText}
              </span>
            )}
          </label>
          {val && /^https?:\/\//.test(val) && (
            <a
              href={val}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
              title="Open link in new tab"
            >
              Test <ExternalLink size={11} />
            </a>
          )}
        </div>
        <input
          className="in"
          id={`field-${field}`}
          type="url"
          style={missing ? getHighlightStyle(val) : undefined}
          placeholder={placeholder}
          value={val}
          onChange={(e) => validateUrl(field, e.target.value)}
        />
        {err ? (
          <p className="hint err" role="alert" style={{ color: 'var(--error)', margin: '2px 0 0', fontSize: '11px' }}>
            {err}
          </p>
        ) : (
          <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="view" id="v-links" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Core Application Profiles Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(76, 69, 65, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
              }}
            >
              <Globe size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                Core & Resume Links
              </h2>
              <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Primary profiles auto-filled across Greenhouse, Workday, Lever, and Google Forms.
              </p>
            </div>
          </div>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertCircle size={12} /> Essential links missing
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {renderUrlField(
            'linkedInUrl',
            'LinkedIn Profile URL',
            'https://linkedin.com/in/username',
            'Essential for tech & business job applications.',
            true,
            isMissing(links.linkedInUrl) ? '• Essential' : undefined
          )}
          {renderUrlField(
            'githubUrl',
            'GitHub Profile URL',
            'https://github.com/username',
            'Recommended for software engineers and developers.',
            true,
            isMissing(links.githubUrl) ? '• Recommended' : undefined
          )}
          {renderUrlField(
            'portfolioUrl',
            'Personal Portfolio / Website',
            'https://yourname.dev',
            'Personal website, projects showcase, or home page.'
          )}
          {renderUrlField(
            'resumeDriveUrl',
            'Resume Drive / Cloud Link',
            'https://drive.google.com/file/d/...',
            'Shareable Google Drive or Dropbox link for forms that ask for a resume URL.',
            false,
            '• Forms & Startups'
          )}
        </div>
      </Card>

      {/* 2. Competitive Programming & Coding Platforms Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(76, 69, 65, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <Code size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
              Competitive Programming & Problem Solving
            </h2>
            <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Frequently requested in engineering campus drives and coding role applications.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {renderUrlField(
            'leetcodeUrl',
            'LeetCode Profile URL',
            'https://leetcode.com/username',
            'DSA & algorithm problem-solving profile.'
          )}
          {renderUrlField(
            'codeforcesUrl',
            'Codeforces Profile URL',
            'https://codeforces.com/profile/handle',
            'Competitive programming handle & contest rating.'
          )}
          {renderUrlField(
            'codechefUrl',
            'CodeChef Profile URL',
            'https://www.codechef.com/users/handle',
            'Star rating and division statistics.'
          )}
          {renderUrlField(
            'hackerrankUrl',
            'HackerRank Profile URL',
            'https://www.hackerrank.com/username',
            'Badges and skill verification profile.'
          )}
          {renderUrlField(
            'gfgUrl',
            'GeeksforGeeks Profile URL',
            'https://auth.geeksforgeeks.org/user/username',
            'Practice scores and institute rank.'
          )}
        </div>
      </Card>

      {/* 3. Design & Creative Portfolios Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(76, 69, 65, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <Palette size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
              Design & Creative Portfolios
            </h2>
            <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Visual showcases for UI/UX designers, product designers, and artists.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {renderUrlField(
            'behanceUrl',
            'Behance Portfolio URL',
            'https://www.behance.net/username',
            'Adobe Behance project cases and design portfolio.'
          )}
          {renderUrlField(
            'dribbbleUrl',
            'Dribbble Profile URL',
            'https://dribbble.com/username',
            'Design shots, illustrations, and UI animations.'
          )}
        </div>
      </Card>

      {/* 4. Community, Data Science & Writing Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(76, 69, 65, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <Share2 size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
              Social, Data Science & Thought Leadership
            </h2>
            <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Public footprint, data science competitions, and published technical writing.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {renderUrlField(
            'xUrl',
            'X / Twitter Profile URL',
            'https://x.com/username',
            'Your public professional presence on X (formerly Twitter).'
          )}
          {renderUrlField(
            'kaggleUrl',
            'Kaggle Profile URL',
            'https://www.kaggle.com/username',
            'Competitions, datasets, and notebooks for ML/AI and data science.'
          )}
          {renderUrlField(
            'mediumUrl',
            'Medium / Tech Blog / Substack',
            'https://medium.com/@username',
            'Technical publications, tutorials, and research articles.'
          )}
        </div>
      </Card>

      {/* 5. Custom / Other Professional Links Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(76, 69, 65, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
              }}
            >
              <LinkIcon size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                Custom & Other Links
              </h2>
              <p className="hint" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Add links for any other platform (GitLab, Bitbucket, YouTube, ArtStation, Google Scholar, etc.).
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAddCustomLink()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
            }}
          >
            <Plus size={14} /> Add Link
          </button>
        </div>

        {customLinks.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(76, 69, 65, 0.03)',
              borderRadius: '8px',
              border: '1px dashed var(--border)',
              marginTop: '12px',
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              No custom links added yet. Click &quot;Add Link&quot; or choose a quick preset below:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              {['GitLab', 'Substack', 'YouTube', 'ArtStation', 'Google Scholar'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddCustomLink(preset)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '99px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={11} style={{ color: 'var(--theme)' }} /> + {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {customLinks.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 200px) 1fr auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'rgba(76, 69, 65, 0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Platform / Label
                  </label>
                  <input
                    className="in"
                    type="text"
                    placeholder="e.g. GitLab, YouTube"
                    value={item.label}
                    onChange={(e) => handleUpdateCustomLink(index, 'label', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Profile / Portfolio URL
                  </label>
                  <input
                    className="in"
                    type="url"
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => handleUpdateCustomLink(index, 'url', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '16px' }}>
                  {item.url && /^https?:\/\//.test(item.url) && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Open link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomLink(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleAddCustomLink()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--theme)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                <Plus size={14} /> Add another custom link
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
