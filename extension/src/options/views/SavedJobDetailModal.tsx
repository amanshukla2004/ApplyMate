import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { SavedJobRecord, SavedJobType, SavedJobStatus } from '../../types/savedJob';
import { Copy, Check, ExternalLink, RefreshCw, Trash2, Edit3, Save } from 'lucide-react';
import { safeOpenExternalUrl, safeCopyToClipboard } from '../../utils/security';

export interface SavedJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: SavedJobRecord | null;
  onUpdate: (id: string, partial: Partial<SavedJobRecord>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRerunExtraction: (id: string) => Promise<void>;
}

export const SavedJobDetailModal: React.FC<SavedJobDetailModalProps> = ({
  isOpen,
  onClose,
  job,
  onUpdate,
  onDelete,
  onRerunExtraction,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<SavedJobType>('other');
  const [status, setStatus] = useState<SavedJobStatus>('to-apply');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [requiredSubject, setRequiredSubject] = useState('');
  const [requiredInstructions, setRequiredInstructions] = useState('');
  const [formLink, setFormLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    if (job) {
      setJobTitle(job.jobTitle || '');
      setCompany(job.company || '');
      setCategory(job.type || 'other');
      setStatus(job.status || 'to-apply');
      setApplyEmail(job.applyEmail || '');
      setApplyPhone(job.applyPhone || '');
      setRequiredSubject(job.requiredSubject || '');
      setRequiredInstructions(job.requiredInstructions || '');
      setFormLink(job.formLink || '');
      setDeadline(job.deadline || '');
      setJobDescription(job.jobDescription || job.summary || '');
      setRawText(job.rawText || '');
      setIsEditing(false);
    }
  }, [job]);

  if (!job) return null;

  const handleCopy = async (text: string, key: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleCopyAll = async () => {
    const lines = [
      jobTitle ? `Job Title: ${jobTitle}` : '',
      company ? `Company: ${company}` : '',
      category ? `Category: ${category}` : '',
      deadline ? `Deadline: ${deadline}` : '',
      formLink ? `Job / Form Link: ${formLink}` : '',
      applyEmail ? `Apply Email: ${applyEmail}` : '',
      applyPhone ? `Apply Phone: ${applyPhone}` : '',
      requiredSubject ? `Subject: ${requiredSubject}` : '',
      requiredInstructions ? `Requirements: ${requiredInstructions}` : '',
      jobDescription ? `Description:\n${jobDescription}` : '',
    ].filter(Boolean);

    await handleCopy(lines.join('\n\n'), 'all');
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await onUpdate(job.id, {
        jobTitle: jobTitle.trim() || null,
        company: company.trim() || null,
        type: category,
        status,
        applyEmail: applyEmail.trim() || null,
        applyPhone: applyPhone.trim() || null,
        requiredSubject: requiredSubject.trim() || null,
        requiredInstructions: requiredInstructions.trim() || null,
        formLink: formLink.trim() || null,
        deadline: deadline.trim() || null,
        jobDescription: jobDescription.trim() || null,
        summary: jobDescription.trim().slice(0, 300) || null,
        rawText: rawText.trim() || job.rawText,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: SavedJobStatus) => {
    setStatus(newStatus);
    await onUpdate(job.id, { status: newStatus });
  };

  const handleCategoryChange = async (newType: SavedJobType) => {
    setCategory(newType);
    await onUpdate(job.id, { type: newType });
  };

  const handleRerun = async () => {
    setIsRerunning(true);
    try {
      await onRerunExtraction(job.id);
    } finally {
      setIsRerunning(false);
    }
  };

  const formattedDate = new Date(job.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Opening saved job"
      maxWidth="940px"
      style={{
        background: '#FCF0DA',
        color: '#4C4541',
        borderRadius: '16px',
        padding: '20px 24px',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Action Bar: [EDIT] [COPY] [DELETE] [Rerun AI] [category: email/form/phone number/ other] */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingBottom: '14px',
          borderBottom: '1px solid rgba(76, 69, 65, 0.15)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* [EDIT] / [Save] */}
          {isEditing ? (
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              style={{
                background: '#4C4541',
                color: '#FCF0DA',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: '#FFFFFF',
                color: '#4C4541',
                border: '1px solid rgba(76, 69, 65, 0.2)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              <span>EDIT</span>
            </button>
          )}

          {/* [COPY] */}
          <button
            onClick={handleCopyAll}
            style={{
              background: '#FFFFFF',
              color: '#4C4541',
              border: '1px solid rgba(76, 69, 65, 0.2)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            {copiedKey === 'all' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            <span>{copiedKey === 'all' ? 'COPIED!' : 'COPY'}</span>
          </button>

          {/* [DELETE] */}
          <button
            onClick={async () => {
              if (window.confirm('Delete this saved job entry?')) {
                await onDelete(job.id);
                onClose();
              }
            }}
            style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            <span>DELETE</span>
          </button>

          {/* [Rerun AI] */}
          <button
            onClick={handleRerun}
            disabled={isRerunning}
            style={{
              background: '#F2C46A',
              color: '#4C4541',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: isRerunning ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={isRerunning ? 'animate-spin' : ''} />
            <span>{isRerunning ? 'Extracting...' : 'Rerun AI'}</span>
          </button>
        </div>

        {/* Category selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>category:</span>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as SavedJobType)}
            style={{
              background: '#FFFFFF',
              color: '#4C4541',
              border: '1px solid #AEAC78',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="email">Email</option>
            <option value="form">Form</option>
            <option value="phone">Phone Number</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Split View: Left (INFO) | Right (Original Raw Text) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '24px',
          maxHeight: '68vh',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {/* LEFT COLUMN: INFO */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(76, 69, 65, 0.12)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#AEAC78',
            }}
          >
            INFO
          </div>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#756C67', minWidth: '90px' }}>
              Date :
            </span>
            <span style={{ fontSize: '13px', color: '#4C4541', fontWeight: 600 }}>{formattedDate}</span>
          </div>

          {/* Job title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>job title :</label>
            {isEditing ? (
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Frontend Engineer"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : (
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4C4541' }}>
                {jobTitle || <span style={{ color: '#A09893', fontStyle: 'italic' }}>Not specified</span>}
              </div>
            )}
          </div>

          {/* Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>Company :</label>
            {isEditing ? (
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : (
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#4C4541' }}>
                {company || <span style={{ color: '#A09893', fontStyle: 'italic' }}>Not specified</span>}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(76, 69, 65, 0.1)', margin: '4px 0' }} />

          {/* Deadline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>DeadLine :</label>
            {isEditing ? (
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g. Nov 30, 2026 or Next Friday"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : (
              <div style={{ fontSize: '13px', color: deadline ? '#B45309' : '#4C4541', fontWeight: 600 }}>
                {deadline || <span style={{ color: '#A09893' }}>None detected</span>}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(76, 69, 65, 0.1)', margin: '4px 0' }} />

          {/* Job Link/Form link */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>Job Link/Form link :</label>
            {isEditing ? (
              <input
                type="text"
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
                placeholder="https://company.com/apply"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : formLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={formLink}
                  onClick={(e) => {
                    e.preventDefault();
                    safeOpenExternalUrl(formLink);
                  }}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12.5px',
                    color: '#2563EB',
                    textDecoration: 'underline',
                    wordBreak: 'break-all',
                    fontWeight: 600,
                  }}
                >
                  {formLink}
                </a>
                <button
                  onClick={() => safeOpenExternalUrl(formLink)}
                  title="Open in new tab"
                  style={{
                    background: '#EAEBD9',
                    border: '1px solid #AEAC78',
                    borderRadius: '5px',
                    padding: '3px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ExternalLink size={12} color="#4C4541" />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '12.5px', color: '#A09893' }}>None</span>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(76, 69, 65, 0.1)', margin: '4px 0' }} />

          {/* Apply Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>Apply Email :</label>
            {isEditing ? (
              <input
                type="text"
                value={applyEmail}
                onChange={(e) => setApplyEmail(e.target.value)}
                placeholder="hr@company.com"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : applyEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4C4541' }}>{applyEmail}</span>
                <button
                  onClick={() => handleCopy(applyEmail, 'email')}
                  title="Copy email address"
                  style={{
                    background: '#FCF0DA',
                    border: '1px solid #AEAC78',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'email' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                  <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '12.5px', color: '#A09893' }}>None</span>
            )}
          </div>

          {/* Phone (if category phone or phone exists) */}
          {(category === 'phone' || applyPhone || isEditing) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>Phone number :</label>
              {isEditing ? (
                <input
                  type="text"
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #AEAC78',
                    background: '#FCF0DA',
                    fontSize: '13px',
                    color: '#4C4541',
                  }}
                />
              ) : applyPhone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4C4541' }}>{applyPhone}</span>
                  <button
                    onClick={() => handleCopy(applyPhone, 'phone')}
                    title="Copy phone"
                    style={{
                      background: '#FCF0DA',
                      border: '1px solid #AEAC78',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedKey === 'phone' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                    <span>{copiedKey === 'phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '12.5px', color: '#A09893' }}>None</span>
              )}
            </div>
          )}

          {/* Required Subject line */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>required Subject line :</label>
            {isEditing ? (
              <input
                type="text"
                value={requiredSubject}
                onChange={(e) => setRequiredSubject(e.target.value)}
                placeholder="Application: [Job Title] - [Your Name]"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '13px',
                  color: '#4C4541',
                }}
              />
            ) : requiredSubject ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: '#4C4541', fontWeight: 500 }}>{requiredSubject}</span>
                <button
                  onClick={() => handleCopy(requiredSubject, 'subject')}
                  title="Copy subject line"
                  style={{
                    background: '#FCF0DA',
                    border: '1px solid #AEAC78',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  {copiedKey === 'subject' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                  <span>{copiedKey === 'subject' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '12.5px', color: '#A09893' }}>None specified</span>
            )}
          </div>

          {/* Important requirement included in email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
              Important requirement included in email :
            </label>
            {isEditing ? (
              <textarea
                rows={2}
                value={requiredInstructions}
                onChange={(e) => setRequiredInstructions(e.target.value)}
                placeholder="e.g. Include portfolio link, mention years of experience"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '12.5px',
                  color: '#4C4541',
                  resize: 'vertical',
                }}
              />
            ) : (
              <div style={{ fontSize: '12.5px', color: '#4C4541', whiteSpace: 'pre-line' }}>
                {requiredInstructions || <span style={{ color: '#A09893' }}>None specified</span>}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(76, 69, 65, 0.1)', margin: '4px 0' }} />

          {/* Job description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>JOb discription :</label>
            {isEditing ? (
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Job description or extracted summary"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FCF0DA',
                  fontSize: '12px',
                  color: '#4C4541',
                  resize: 'vertical',
                  lineHeight: 1.4,
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '12.5px',
                  color: '#4C4541',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-line',
                }}
              >
                {jobDescription || <span style={{ color: '#A09893' }}>No description extracted</span>}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(76, 69, 65, 0.1)', margin: '4px 0' }} />

          {/* [Status : applied/review/ignore] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>Status :</span>
            {(['applied', 'review', 'ignore', 'to-apply'] as SavedJobStatus[]).map((st) => {
              const isSelected = status === st;
              const labels: Record<string, string> = {
                applied: 'applied',
                review: 'review',
                ignore: 'ignore',
                'to-apply': 'to-apply',
              };

              let bg = '#FFFFFF';
              let textCol = '#4C4541';
              let borderCol = 'rgba(76, 69, 65, 0.2)';

              if (isSelected) {
                if (st === 'applied') {
                  bg = '#EAEBD9';
                  textCol = '#166534';
                  borderCol = '#AEAC78';
                } else if (st === 'review') {
                  bg = '#FDF1D6';
                  textCol = '#B45309';
                  borderCol = '#F2C46A';
                } else if (st === 'ignore') {
                  bg = '#FEE2E2';
                  textCol = '#991B1B';
                  borderCol = '#FCA5A5';
                } else {
                  bg = '#FCF0DA';
                  textCol = '#4C4541';
                  borderCol = '#AEAC78';
                }
              }

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  style={{
                    background: bg,
                    color: textCol,
                    border: `1.5px solid ${borderCol}`,
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '11.5px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Original Raw Text */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(76, 69, 65, 0.12)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#756C67',
              }}
            >
              Original Raw Text
            </span>
            <button
              onClick={() => handleCopy(rawText, 'raw')}
              style={{
                background: '#FCF0DA',
                border: '1px solid #AEAC78',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#4C4541',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copiedKey === 'raw' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
              <span>{copiedKey === 'raw' ? 'Copied' : 'Copy Raw Text'}</span>
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={18}
            placeholder="No raw text saved."
            style={{
              width: '100%',
              flex: 1,
              boxSizing: 'border-box',
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              lineHeight: 1.5,
              background: '#FCF0DA',
              border: '1px solid rgba(174, 172, 120, 0.5)',
              borderRadius: '8px',
              color: '#4C4541',
              resize: 'none',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#756C67' }}>
              {rawText.length} characters • 100% Zero-Cloud Local
            </span>
            {rawText !== job.rawText && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                style={{
                  background: '#AEAC78',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isSaving ? 'Saving...' : 'Save Raw Edits'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
