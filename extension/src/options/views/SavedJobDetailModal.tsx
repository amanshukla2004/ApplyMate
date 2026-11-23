import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { SavedJobRecord, SavedJobType, SavedJobStatus } from '../../types/savedJob';
import { Copy, Check, ExternalLink, RefreshCw, Trash2, Mail, FileText, Code2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'extracted' | 'original'>('extracted');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Form State
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<SavedJobType>('other');
  const [status, setStatus] = useState<SavedJobStatus>('to-apply');
  const [applyEmail, setApplyEmail] = useState('');
  const [requiredSubject, setRequiredSubject] = useState('');
  const [requiredInstructions, setRequiredInstructions] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formQuestionsText, setFormQuestionsText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [summary, setSummary] = useState('');

  // Populate form whenever active job changes
  useEffect(() => {
    if (job) {
      setJobTitle(job.jobTitle || '');
      setCompany(job.company || '');
      setType(job.type || 'other');
      setStatus(job.status || 'to-apply');
      setApplyEmail(job.applyEmail || '');
      setRequiredSubject(job.requiredSubject || '');
      setRequiredInstructions(job.requiredInstructions || '');
      setFormLink(job.formLink || '');
      setFormQuestionsText((job.formQuestions || []).join('\n'));
      setDeadline(job.deadline || '');
      setSummary(job.summary || '');
      setActiveTab('extracted');
    }
  }, [job]);

  if (!job) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const questions = formQuestionsText
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);

      await onUpdate(job.id, {
        jobTitle: jobTitle.trim() || null,
        company: company.trim() || null,
        type,
        status,
        applyEmail: applyEmail.trim() || null,
        requiredSubject: requiredSubject.trim() || null,
        requiredInstructions: requiredInstructions.trim() || null,
        formLink: formLink.trim() || null,
        formQuestions: questions,
        deadline: deadline.trim() || null,
        summary: summary.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRerun = async () => {
    setIsRerunning(true);
    try {
      await onRerunExtraction(job.id);
    } finally {
      setIsRerunning(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this saved job?')) {
      await onDelete(job.id);
      onClose();
    }
  };

  const typeVariant = type === 'email' ? 'r' : type === 'form' ? 'a' : 'i';
  const statusVariant = status === 'applied' ? 'a' : status === 'needs-review' ? 'u' : 'i';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jobTitle || company ? `${jobTitle || 'Role'}${company ? ' at ' + company : ''}` : 'Saved Job Opportunity'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Sub-header Bar: Badges & Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pill variant={typeVariant}>
              {type === 'email' ? '✉️ Email Application' : type === 'form' ? '📋 Form Application' : '💼 Other'}
            </Pill>
            <Pill variant={statusVariant}>
              {status === 'applied' ? '✅ Applied' : status === 'needs-review' ? '⚠️ Needs Review' : '⏳ To Apply'}
            </Pill>
            {job.extractionStatus === 'pending' && (
              <Pill variant="i">🔄 Extracting...</Pill>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="soft"
              size="sm"
              onClick={handleRerun}
              disabled={isRerunning}
              title="Re-run AI extraction from the original raw text"
            >
              <RefreshCw size={13} style={{ marginRight: '5px', animation: isRerunning ? 'spin 1s linear infinite' : undefined }} />
              {isRerunning ? 'Re-running...' : 'Re-run AI'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              title="Delete this saved job"
            >
              <Trash2 size={13} style={{ marginRight: '5px' }} />
              Delete
            </Button>
          </div>
        </div>

        {/* Tab Switcher: Extracted vs Original */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
          <button
            type="button"
            className="chip"
            aria-pressed={activeTab === 'extracted'}
            onClick={() => setActiveTab('extracted')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>Extracted Data</span>
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={activeTab === 'original'}
            onClick={() => setActiveTab('original')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Code2 size={14} />
            <span>Original Raw Text</span>
          </button>
        </div>

        {/* TAB 1: Extracted Data */}
        {activeTab === 'extracted' && (
          <form onSubmit={handleSaveChanges} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Quick 1-Click Copy Bar */}
            {(applyEmail || requiredSubject || formLink) && (
              <div
                style={{
                  background: 'rgba(139, 116, 240, 0.08)',
                  border: '1px solid rgba(139, 116, 240, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>
                  Quick Actions:
                </span>
                {applyEmail && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => handleCopy(applyEmail, 'modal-email')}
                  >
                    {copiedKey === 'modal-email' ? <Check size={13} style={{ marginRight: '4px', color: '#10B981' }} /> : <Mail size={13} style={{ marginRight: '4px' }} />}
                    <span>{copiedKey === 'modal-email' ? 'Email Copied!' : `Copy Email (${applyEmail})`}</span>
                  </Button>
                )}
                {requiredSubject && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => handleCopy(requiredSubject, 'modal-subj')}
                  >
                    {copiedKey === 'modal-subj' ? <Check size={13} style={{ marginRight: '4px', color: '#10B981' }} /> : <Copy size={13} style={{ marginRight: '4px' }} />}
                    <span>{copiedKey === 'modal-subj' ? 'Subject Copied!' : 'Copy Required Subject'}</span>
                  </Button>
                )}
                {formLink && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => window.open(formLink, '_blank')}
                  >
                    <ExternalLink size={13} style={{ marginRight: '4px' }} />
                    <span>Open Form Link</span>
                  </Button>
                )}
              </div>
            )}

            {/* Editable Fields Grid */}
            <div className="grid-2">
              <div>
                <label className="lbl">Job Title</label>
                <input
                  type="text"
                  className="txt"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                />
              </div>
              <div>
                <label className="lbl">Company</label>
                <input
                  type="text"
                  className="txt"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label className="lbl">Application Type</label>
                <select
                  className="txt"
                  value={type}
                  onChange={(e) => setType(e.target.value as SavedJobType)}
                >
                  <option value="email">Email Application</option>
                  <option value="form">Form Application</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="lbl">Status</label>
                <select
                  className="txt"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SavedJobStatus)}
                >
                  <option value="to-apply">To Apply</option>
                  <option value="applied">Applied</option>
                  <option value="needs-review">Needs Review</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label className="lbl">Apply Email</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="email"
                    className="txt"
                    value={applyEmail}
                    onChange={(e) => setApplyEmail(e.target.value)}
                    placeholder="e.g. careers@company.com"
                  />
                  {applyEmail && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => handleCopy(applyEmail, 'input-email')}
                      title="Copy email"
                    >
                      {copiedKey === 'input-email' ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="lbl">Deadline</label>
                <input
                  type="text"
                  className="txt"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="e.g. Next Friday, Dec 1st"
                />
              </div>
            </div>

            <div>
              <label className="lbl">Required Subject Line</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="txt"
                  value={requiredSubject}
                  onChange={(e) => setRequiredSubject(e.target.value)}
                  placeholder="e.g. Application: Senior Frontend Developer - John Doe"
                />
                {requiredSubject && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => handleCopy(requiredSubject, 'input-subj')}
                    title="Copy subject line"
                  >
                    {copiedKey === 'input-subj' ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="lbl">Form Link</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  className="txt"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://forms.gle/... or https://jobs.lever.co/..."
                />
                {formLink && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => window.open(formLink, '_blank')}
                    title="Open form link"
                  >
                    <ExternalLink size={14} />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="lbl">Required Instructions</label>
              <textarea
                className="txt"
                rows={2}
                value={requiredInstructions}
                onChange={(e) => setRequiredInstructions(e.target.value)}
                placeholder="Specific directions: 'Attach portfolio PDF', 'Mention notice period & current CTC', etc."
              />
            </div>

            <div>
              <label className="lbl">Form Questions (one question per line)</label>
              <textarea
                className="txt"
                rows={2}
                value={formQuestionsText}
                onChange={(e) => setFormQuestionsText(e.target.value)}
                placeholder="Question 1&#10;Question 2&#10;Question 3"
              />
            </div>

            <div>
              <label className="lbl">Summary</label>
              <textarea
                className="txt"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief 1-2 sentence overview of the role and action required"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button type="button" variant="soft" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: Original Raw Text */}
        {activeTab === 'original' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Exact pasted text stored untouched:
              </span>
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => handleCopy(job.rawText, 'modal-raw')}
              >
                {copiedKey === 'modal-raw' ? <Check size={13} style={{ marginRight: '4px', color: '#10B981' }} /> : <Copy size={13} style={{ marginRight: '4px' }} />}
                <span>{copiedKey === 'modal-raw' ? 'Copied Raw Text!' : 'Copy Original Text'}</span>
              </Button>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '340px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--ink)',
              }}
            >
              {job.rawText}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
