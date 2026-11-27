import React, { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Pill } from '../ui/Pill';
import { UserProfile, ResumeRecord } from '../../types/profile';
import { resumeService } from '../../services/resumeService';
import { profileService } from '../../services/profileService';
import { projectService } from '../../services/projectService';
import { PDFParserService } from '../../services/pdf/pdfParserService';
import { ResumeParserService } from '../../services/pdf/resumeParserService';

export interface OnboardingWizardProps {
  profile: UserProfile | null;
  resumes: ResumeRecord[];
  onComplete: () => void;
  onProfileUpdated: () => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  profile,
  resumes,
  onComplete,
  onProfileUpdated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(resumes.length > 0 ? 2 : 1);
  const [isParsing, setIsParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [simulatedFill, setSimulatedFill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick editable state for Step 2
  const [firstName, setFirstName] = useState(profile?.personal?.firstName || '');
  const [lastName, setLastName] = useState(profile?.personal?.lastName || '');
  const [email, setEmail] = useState(profile?.personal?.email || '');
  const [phone, setPhone] = useState(profile?.personal?.phone || '');
  const [linkedIn, setLinkedIn] = useState(profile?.links?.linkedInUrl || '');
  const [github, setGithub] = useState(profile?.links?.githubUrl || '');
  const [resumeDriveUrl, setResumeDriveUrl] = useState(profile?.links?.resumeDriveUrl || '');

  const handleFileUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15 MB limit. Please select a resume PDF under 15 MB.');
      return;
    }

    setIsParsing(true);
    setParseMessage('Reading PDF buffer locally (Zero-Cloud)...');

    try {
      await resumeService.saveResume(file, file.name);

      setParseMessage('Extracting skills, contact details & education...');
      const extractedText = await PDFParserService.extractText(file);
      const data = ResumeParserService.parse(extractedText);

      setParseMessage('Saving profile data into local vault...');
      if (data.personal || data.address || data.links) {
        await profileService.updateProfile({
          personal: data.personal as any,
          address: data.address as any,
          links: data.links as any,
        });
        if (data.personal?.firstName) setFirstName(data.personal.firstName);
        if (data.personal?.lastName) setLastName(data.personal.lastName);
        if (data.personal?.email) setEmail(data.personal.email);
        if (data.personal?.phone) setPhone(data.personal.phone);
        if (data.links?.linkedInUrl) setLinkedIn(data.links.linkedInUrl);
        if (data.links?.githubUrl) setGithub(data.links.githubUrl);
      }

      for (const edu of data.education) {
        await profileService.saveEducation(edu);
      }
      for (const exp of data.experience) {
        await profileService.saveExperience(exp);
      }
      if (data.projects) {
        for (const prj of data.projects) {
          await projectService.saveProject(prj);
        }
      }
      for (const sk of data.skills) {
        await profileService.saveSkill(sk);
      }

      await onProfileUpdated();
      setParseMessage('Resume parsed successfully! 100% client-side.');
      setTimeout(() => {
        setIsParsing(false);
        setStep(2);
      }, 700);
    } catch (err) {
      console.warn('Onboarding resume parse error:', err);
      setParseMessage('Failed to parse PDF. You can still fill in your details manually.');
      setIsParsing(false);
      setTimeout(() => setStep(2), 1200);
    }
  };

  const handleSaveStep2 = async () => {
    try {
      await profileService.updateProfile({
        personal: {
          firstName,
          lastName,
          email,
          phone,
        } as any,
        links: {
          linkedInUrl: linkedIn,
          githubUrl: github,
          resumeDriveUrl,
        } as any,
      });
      await onProfileUpdated();
      setStep(3);
    } catch (err) {
      console.warn('Step 2 save error:', err);
      setStep(3);
    }
  };

  const runDemoAutofill = () => {
    setSimulatedFill(true);
    setTimeout(() => {
      // Finished simulation
    }, 1200);
  };

  return (
    <div className="onboarding-overlay">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      <div className="onboarding-card glass">
        {/* Top Header */}
        <div className="onboarding-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive, sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: 1,
                    color: 'var(--text)',
                  }}
                >
                  happlied
                </span>
                <span className="onboarding-pill-badge">Rapid Setup</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {step === 1 ? 'Step 1 of 3: Sync Resume' : step === 2 ? 'Step 2 of 3: Verify Profile' : 'Step 3 of 3: Superpower Ready'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '99px',
                background: 'var(--hover)',
                border: '1px solid var(--border)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{step}/3</span>
            </div>
            <button
              type="button"
              className="onboarding-close-btn"
              onClick={onComplete}
              title="Skip setup and go to sidepanel"
              aria-label="Skip setup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* STEP 1: RESUME UPLOAD */}
        {step === 1 && (
          <div className="onboarding-step-body">
            <div className="onboarding-title-group">
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                Drop your resume to get started
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                Zero cloud uploads. Your PDF is parsed 100% locally in your browser to extract your work history, skills, and links.
              </p>
            </div>

            <div
              className={`onboarding-dropzone ${isParsing ? 'parsing' : ''}`}
              onClick={() => !isParsing && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {isParsing ? '⚙️' : '📄'}
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                {isParsing ? 'Extracting Resume...' : 'Click or Drag PDF Resume here'}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                {parseMessage || 'Supports .pdf format · 100% Zero-Cloud'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                className="onboarding-subtle-link"
                onClick={() => setStep(2)}
              >
                Skip upload & enter manually →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY POWER PROFILE */}
        {step === 2 && (
          <div className="onboarding-step-body">
            <div className="onboarding-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Pill variant="m">Profile Extracted</Pill>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Quick Review</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                Verify Your Key Information
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                happlied uses these canonical fields to autofill jobs on Workday, Greenhouse, Ashby, and Lever.
              </p>
            </div>

            <div className="onboarding-fields-grid">
              <div>
                <label className="onboarding-label">First Name</label>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={firstName}
                  placeholder="e.g. Alex"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="onboarding-label">Last Name</label>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={lastName}
                  placeholder="e.g. Rivers"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <label className="onboarding-label">Email Address</label>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={email}
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="onboarding-label">Phone Number</label>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={phone}
                  placeholder="+1 555-0192"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="onboarding-label">LinkedIn Profile URL</label>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={linkedIn}
                  placeholder="https://linkedin.com/in/username"
                  onChange={(e) => setLinkedIn(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="onboarding-label">Google Drive / Public Resume Link</label>
                  <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600 }}>Optional</span>
                </div>
                <input
                  className="in"
                  style={{ height: '38px', minHeight: '38px', fontSize: '13px' }}
                  value={resumeDriveUrl}
                  placeholder="https://drive.google.com/file/d/..."
                  onChange={(e) => setResumeDriveUrl(e.target.value)}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Auto-fills forms asking for a Drive/public link to your resume instead of a file upload.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <button
                type="button"
                className="onboarding-subtle-link"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <Button size="sm" onClick={handleSaveStep2}>
                Save & Test Superpower →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUPERPOWER DEMO & CELEBRATION */}
        {step === 3 && (
          <div className="onboarding-step-body">
            <div className="onboarding-title-group" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>⚡</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                Your Superpower: Alt + A
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                Anytime you open any job application page, hit <kbd className="onboarding-kbd">Alt + A</kbd> or click the floating bubble to fill all fields instantly!
              </p>
            </div>

            <div className="onboarding-demo-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                  Interactive Demo
                </span>
                <span className={`onboarding-demo-tag ${simulatedFill ? 'filled' : ''}`}>
                  {simulatedFill ? '✓ All Fields Matched' : 'Form Detected'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div className="onboarding-demo-field">
                  <span className="onboarding-demo-lbl">Full Name</span>
                  <span className="onboarding-demo-val">
                    {simulatedFill ? `${firstName || 'Alex'} ${lastName || 'Rivers'}` : '...'}
                  </span>
                </div>
                <div className="onboarding-demo-field">
                  <span className="onboarding-demo-lbl">Email</span>
                  <span className="onboarding-demo-val">
                    {simulatedFill ? (email || 'alex@dev.io') : '...'}
                  </span>
                </div>
                <div className="onboarding-demo-field">
                  <span className="onboarding-demo-lbl">Phone</span>
                  <span className="onboarding-demo-val">
                    {simulatedFill ? (phone || '+1 555-0192') : '...'}
                  </span>
                </div>
                <div className="onboarding-demo-field">
                  <span className="onboarding-demo-lbl">Work Auth</span>
                  <span className="onboarding-demo-val">
                    {simulatedFill ? 'Authorized / Yes' : '...'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <Button
                  size="sm"
                  variant={simulatedFill ? 'soft' : 'primary'}
                  onClick={runDemoAutofill}
                  style={{ width: '100%' }}
                >
                  {simulatedFill ? '🎉 Autofill Verified (0.24s)' : '⚡ Click to Test 1-Click Fill'}
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
                onClick={onComplete}
              >
                🚀 Start Applying with happlied
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
