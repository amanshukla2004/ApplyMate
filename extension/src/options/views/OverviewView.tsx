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
  onNavigate: (section: string) => void;
  onUploadResume?: (file: File) => Promise<void>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  applications,
  readiness,
  hasResume,
  hasSkills,
  onNavigate,
  onUploadResume,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Application status counts
  const savedCount = applications.filter((a) => a.status === 'Saved').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const interviewCount = applications.filter((a) => a.status === 'Interview').length;

  const hasPersonal = Boolean(profile?.personal?.firstName && profile?.personal?.email);

  // Calculate missing essential fields that need candidate review
  const missingFields: { label: string; section: string }[] = [];
  if (!profile?.personal?.phone) missingFields.push({ label: 'Phone number', section: 'personal' });
  if (!profile?.address?.addressLine1) missingFields.push({ label: 'Street address', section: 'address' });
  if (!profile?.address?.city) missingFields.push({ label: 'City', section: 'address' });
  if (!profile?.links?.linkedInUrl) missingFields.push({ label: 'LinkedIn profile', section: 'links' });
  if (!profile?.links?.githubUrl) missingFields.push({ label: 'GitHub profile', section: 'links' });

  const handleOpenTestPortal = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('test-portal.html') });
    } else {
      window.open('./test-portal.html', '_blank');
    }
  };

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

      {/* First-Time User Onboarding Banner */}
      {!hasResume && (
        <div
          className="card glass"
          style={{
            background: 'linear-gradient(135deg, rgba(174, 172, 120, 0.22) 0%, rgba(242, 196, 106, 0.12) 100%)',
            borderColor: 'rgba(174, 172, 120, 0.4)',
            padding: '20px 24px',
            marginBottom: '16px',
            borderRadius: '20px',
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
                borderRadius: '12px',
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

      {/* Main Readiness Hero */}
      <Card className="hero">
        <Ring percentage={readiness} size={124} />
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ fontSize: '26px', marginBottom: '6px' }}>
            Profile {readiness}% Ready
          </h2>
          <p style={{ color: 'var(--muted)' }}>
            {readiness === 100
              ? 'All set! happlied is fully equipped to autofill technical applications across Workday, Greenhouse, Ashby, and Lever.'
              : 'Complete the remaining fields below so your autofill answers every question seamlessly.'}
          </p>
        </div>
        <div className="steps">
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('vault')}
          >
            <Pill variant={hasResume ? 'm' : 'r'}>
              {hasResume ? 'Done' : 'To do'}
            </Pill>
            {hasResume ? 'Resume active' : 'Upload resume'}
          </button>
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('personal')}
          >
            <Pill variant={hasPersonal ? 'm' : 'r'}>
              {hasPersonal ? 'Done' : 'To do'}
            </Pill>
            Personal details
          </button>
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('skills')}
          >
            <Pill variant={hasSkills ? 'm' : 'r'}>
              {hasSkills ? 'Done' : 'To do'}
            </Pill>
            {hasSkills ? 'Skills added' : 'Add 5 more skills'}
          </button>
        </div>
      </Card>

      {/* Incomplete Fields Review Alert (shown when some parsed details need attention) */}
      {hasResume && missingFields.length > 0 && (
        <div
          className="card glass"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            padding: '14px 18px',
            borderRadius: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#F59E0B', fontSize: '16px' }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#F59E0B' }}>
              Fields Needing Review ({missingFields.length})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Some details were not found in your resume. Click any field below to complete it:
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {missingFields.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.section)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--ink)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>+ Complete {item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Quick Stats - Simplified Clean Cards */}
      <div className="stats">
        <div className="stat">
          <span className="stat-title">Saved</span>
          <b>{savedCount}</b>
          <span className="stat-desc">Ready to apply</span>
        </div>
        <div className="stat">
          <span className="stat-title">Applied</span>
          <b>{appliedCount}</b>
          <span className="stat-desc">Submitted</span>
        </div>
        <div className="stat">
          <span className="stat-title">Total Tracked</span>
          <b>{applications.length}</b>
          <span className="stat-desc">Pipeline total</span>
        </div>
        <div className="stat">
          <span className="stat-title">Interviews</span>
          <b>{interviewCount}</b>
          <span className="stat-desc">In progress</span>
        </div>
      </div>

      {/* Test UI & Autofill Playground Card */}
      <div
        className="card glass"
        style={{
          marginTop: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🧪</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Test UI & Form Autofill Playground
              </h3>
              <Pill variant="m">Interactive Test Form</Pill>
            </div>
            <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
              Test autofill with your saved profile data against a complete 15-field mock job application.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          style={{
            background: 'var(--theme)',
            color: 'var(--btn-t)',
            fontWeight: 600,
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={handleOpenTestPortal}
        >
          🚀 Open Test Form
        </Button>
      </div>
    </div>
  );
};
