import React, { useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Ring } from '../../components/ui/Ring';
import { Pill } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { UserProfile, ApplicationRecord } from '../../types/profile';

export interface OverviewViewProps {
  profile: UserProfile | null;
  applications: ApplicationRecord[];
  readiness: number;
  hasResume: boolean;
  hasSkills: boolean;
  isAiEnabled?: boolean;
  educationCount?: number;
  experienceCount?: number;
  projectsCount?: number;
  certificatesCount?: number;
  formattedDate?: string;
  greetingHeading?: string;
  onNavigate: (section: string) => void;
  onUploadResume?: (file: File) => Promise<void>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  applications,
  readiness,
  hasResume,
  hasSkills,
  isAiEnabled = true,
  educationCount = 0,
  experienceCount = 0,
  projectsCount = 0,
  certificatesCount = 0,
  formattedDate,
  greetingHeading,
  onNavigate,
  onUploadResume,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Application status counts
  const savedCount = applications.filter((a) => a.status === 'Saved').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const interviewCount = applications.filter((a) => a.status === 'Interview').length;

  const hasPersonal = Boolean(
    profile?.personal?.firstName && profile?.personal?.email && profile?.personal?.phone
  );

  // Calculate missing essential sections that need candidate attention to hit 100%
  const missingSections: { label: string; section: string }[] = [];
  if (
    (!profile?.preferences?.preferredTitles || profile.preferences.preferredTitles.length === 0) &&
    !profile?.preferences?.noticePeriodDays &&
    !profile?.preferences?.workAuthorizationStatus
  ) {
    missingSections.push({ label: 'Preferences', section: 'prefs' });
  }
  if (experienceCount === 0) {
    missingSections.push({ label: 'Experience', section: 'exp' });
  }
  if (projectsCount === 0) {
    missingSections.push({ label: 'Projects', section: 'proj' });
  }
  if (certificatesCount === 0) {
    missingSections.push({ label: 'Certificates', section: 'certs' });
  }
  if (educationCount === 0) {
    missingSections.push({ label: 'Education', section: 'edu' });
  }
  if (!hasResume) {
    missingSections.push({ label: 'Resume', section: 'vault' });
  }
  if (!hasPersonal) {
    missingSections.push({ label: 'Personal details', section: 'personal' });
  }
  if (!hasSkills) {
    missingSections.push({ label: 'Skills', section: 'skills' });
  }

  // Calculate specific missing fields within contact/address
  const missingFields: { label: string; section: string }[] = [];
  if (!profile?.personal?.phone) missingFields.push({ label: 'Phone number', section: 'personal' });
  if (!profile?.address?.addressLine1) missingFields.push({ label: 'Street address', section: 'address' });
  if (!profile?.address?.city) missingFields.push({ label: 'City', section: 'address' });
  if (!profile?.links?.linkedInUrl) missingFields.push({ label: 'LinkedIn profile', section: 'links' });
  if (!profile?.links?.githubUrl) missingFields.push({ label: 'GitHub profile', section: 'links' });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadResume) {
      setIsUploading(true);
      try {
        await onUploadResume(file);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="view" id="v-overview">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Date & Greeting - Strictly rendered ONLY on Overview (Request #12) */}
      {(greetingHeading || formattedDate) && (
        <div className="head" style={{ marginBottom: '22px' }}>
          <div>
            {formattedDate && (
              <p style={{ margin: '0 0 5px', color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: 500 }}>
                {formattedDate}
              </p>
            )}
            {greetingHeading && (
              <h1 style={{ fontSize: '30px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {greetingHeading}
              </h1>
            )}
          </div>
        </div>
      )}

      {/* First-Time User Onboarding Banner */}
      {!hasResume && (
        <div
          className="card glass"
          style={{
            background: 'linear-gradient(135deg, rgba(174, 172, 120, 0.22) 0%, rgba(242, 196, 106, 0.12) 100%)',
            borderColor: 'rgba(174, 172, 120, 0.4)',
            padding: '22px 26px',
            marginBottom: '18px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ maxWidth: '580px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>
                  Start Here: Instant 10-Second Profile Setup
                </h3>
                <Pill variant="m">100% Private (Zero-Cloud)</Pill>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.5 }}>
                Drop your existing PDF resume below. happlied automatically extracts your contact details, education, projects, and technical skills directly in your browser without uploading to any remote server.
              </p>
            </div>
            <Button
              size="sm"
              style={{
                background: '#4C4541',
                color: '#ffffff',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 4px 14px rgba(76, 69, 65, 0.25)',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Parsing Resume...' : '📄 Upload Resume (PDF)'}
            </Button>
          </div>
        </div>
      )}

      {/* Main Readiness Hero - Increased size & prominent layout (Request #8) */}
      <Card
        className="hero"
        style={{
          padding: '28px 30px',
          display: 'flex',
          gap: '30px',
          alignItems: 'center',
          flexWrap: 'wrap',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <Ring percentage={readiness} size={136} />

        <div style={{ flex: 1, minWidth: '260px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
            Profile {readiness}% Ready
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 12px' }}>
            {readiness === 100
              ? 'All set! happlied is fully equipped to autofill technical applications across Workday, Greenhouse, Ashby, and Lever.'
              : 'Complete the remaining fields below so your autofill answers every question seamlessly.'}
          </p>

          {/* AI Copilot Status Indicator (Request #10) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              style={{
                background: isAiEnabled ? 'rgba(174, 172, 120, 0.22)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${isAiEnabled ? '#AEAC78' : '#EF4444'}`,
                color: isAiEnabled ? 'var(--text)' : '#DC2626',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to configure AI settings"
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isAiEnabled ? '#10B981' : '#EF4444',
                }}
              />
              <span>{isAiEnabled ? 'AI Copilot: Enabled ⚡' : 'AI Copilot: Disabled'}</span>
            </button>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {isAiEnabled ? 'Zero-Cloud Local RAG Active' : 'Click to enable in Settings'}
            </span>
          </div>
        </div>

        {/* Missing Fields Warning Highlights (Request #4) */}
        {missingSections.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(242, 196, 106, 0.12)',
              border: '1px solid #F2C46A',
              borderRadius: '10px',
              padding: '14px 16px',
              minWidth: '260px',
              maxWidth: '400px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>⚠️</span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#B45309' }}>
                Missing fields to reach 100%:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {missingSections.map((m) => (
                <button
                  key={m.section}
                  type="button"
                  onClick={() => onNavigate(m.section)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid #F2C46A',
                    color: '#92400E',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(242, 196, 106, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                  title={`Click to fill in ${m.label}`}
                >
                  <span>+ Add {m.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10B981',
              borderRadius: '10px',
              padding: '14px 18px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🎉</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Profile 100% Complete!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Autofill is fully armed with all required data.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Incomplete Fields Review Alert (shown when specific parsed details need attention) */}
      {hasResume && missingFields.length > 0 && (
        <div
          className="card glass"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            padding: '14px 18px',
            borderRadius: '12px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#F59E0B', fontSize: '16px' }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#B45309' }}>
              Fields Needing Review ({missingFields.length})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Some contact details were not found in your resume. Click any field below to complete it:
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {missingFields.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.section)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: 'var(--ink)',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#B45309')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)')}
              >
                <span>+ Complete {item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Quick Stats - Clickable Interactive Cards (Request #3) */}
      <div className="stats" style={{ marginTop: '20px' }}>
        <div
          className="stat"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('saved-jobs')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('saved-jobs');
          }}
          title="Click to view Saved Jobs"
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Saved</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>↗</span>
          </div>
          <b style={{ fontSize: '32px' }}>{savedCount}</b>
          <span className="stat-desc">Ready to apply</span>
        </div>

        <div
          className="stat"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pipeline')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('pipeline');
          }}
          title="Click to view Applied Jobs in Application Tracker"
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Applied</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>↗</span>
          </div>
          <b style={{ fontSize: '32px' }}>{appliedCount}</b>
          <span className="stat-desc">Submitted</span>
        </div>

        <div
          className="stat"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pipeline')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('pipeline');
          }}
          title="Click to view all Applications in Application Tracker"
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Total Tracked</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>↗</span>
          </div>
          <b style={{ fontSize: '32px' }}>{applications.length}</b>
          <span className="stat-desc">Tracker total</span>
        </div>

        <div
          className="stat"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pipeline')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('pipeline');
          }}
          title="Click to view Interview stages in Application Tracker"
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Interviews</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>↗</span>
          </div>
          <b style={{ fontSize: '32px' }}>{interviewCount}</b>
          <span className="stat-desc">In progress</span>
        </div>
      </div>
    </div>
  );
};
