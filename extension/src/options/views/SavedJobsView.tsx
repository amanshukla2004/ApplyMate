import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill, PillVariant } from '../../components/ui/Pill';
import { Chip } from '../../components/ui/Chip';
import { SavedJobRecord, SavedJobStatus } from '../../types/savedJob';
import { SavedJobDetailModal } from './SavedJobDetailModal';
import { safeOpenExternalUrl, safeCopyToClipboard } from '../../utils/security';
import {
  BookmarkPlus,
  Search,
  Mail,
  Copy,
  ExternalLink,
  Check,
  Trash2,
  Eye,
  Sparkles,
  Clock,
} from 'lucide-react';

export interface SavedJobsViewProps {
  savedJobs: SavedJobRecord[];
  onUpdateJob: (id: string, partial: Partial<SavedJobRecord>) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onRerunExtraction: (id: string) => Promise<void>;
  onSaveRawJob: (text: string) => Promise<void>;
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  savedJobs,
  onUpdateJob,
  onDeleteJob,
  onRerunExtraction,
  onSaveRawJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Inline Quick Save Box in Dashboard
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [quickSaveText, setQuickSaveText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detail Modal
  const [selectedJob, setSelectedJob] = useState<SavedJobRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaveText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveRawJob(quickSaveText.trim());
      setQuickSaveText('');
      setShowQuickSave(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, job: SavedJobRecord) => {
    e.stopPropagation();
    const nextStatus: SavedJobStatus = job.status === 'applied' ? 'to-apply' : 'applied';
    await onUpdateJob(job.id, { status: nextStatus });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved job?')) {
      await onDeleteJob(id);
      if (selectedJob?.id === id) {
        setSelectedJob(null);
      }
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Filtered Jobs
  const filteredJobs = savedJobs.filter((job) => {
    // Type filter
    if (selectedType !== 'All' && job.type !== selectedType.toLowerCase()) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'All') {
      const statusKey = selectedStatus.toLowerCase().replace(/\s+/g, '-');
      if (job.status !== statusKey) {
        return false;
      }
    }
    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (job.jobTitle || '').toLowerCase().includes(q) ||
      (job.company || '').toLowerCase().includes(q) ||
      (job.applyEmail || '').toLowerCase().includes(q) ||
      (job.requiredSubject || '').toLowerCase().includes(q) ||
      (job.summary || '').toLowerCase().includes(q) ||
      job.rawText.toLowerCase().includes(q)
    );
  });

  const totalCount = savedJobs.length;
  const toApplyCount = savedJobs.filter((j) => j.status === 'to-apply').length;
  const appliedCount = savedJobs.filter((j) => j.status === 'applied').length;
  const needsReviewCount = savedJobs.filter((j) => j.status === 'needs-review').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Saved Jobs
            </h2>
            <Pill variant="i">{totalCount} saved</Pill>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13.5px' }}>
            Quick-captured job posts, email opportunities, and forms ready to act on later.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowQuickSave(!showQuickSave)}
        >
          <BookmarkPlus size={16} style={{ marginRight: '6px' }} />
          <span>{showQuickSave ? 'Close Box' : 'Quick Save Job'}</span>
        </Button>
      </div>

      {/* Inline Quick Save Form */}
      {showQuickSave && (
        <Card>
          <form onSubmit={handleQuickSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                Paste Raw Job Details, Email Application, or Form Link
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} color="#8B74F0" />
                <span>Zero-loss storage + LLM structured extraction</span>
              </span>
            </div>

            <textarea
              className="in"
              rows={4}
              value={quickSaveText}
              onChange={(e) => setQuickSaveText(e.target.value)}
              placeholder="Paste any job posting text, email instructions ('Email resume to jobs@xyz.com with subject Application - Role'), or Google Form / Lever / Ashby link..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                type="button"
                variant="soft"
                onClick={() => {
                  setQuickSaveText('');
                  setShowQuickSave(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!quickSaveText.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Job Opportunity'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            type="text"
            className="in"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved jobs by title, company, email, subject, or keywords..."
            style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filters and Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Type Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Type:</span>
            {['All', 'Email', 'Form', 'Other'].map((t) => (
              <Chip
                key={t}
                active={selectedType === t}
                onClick={() => setSelectedType(t)}
              >
                {t}
              </Chip>
            ))}
          </div>

          {/* Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Status:</span>
            {[
              { label: 'All', count: totalCount },
              { label: 'To Apply', count: toApplyCount },
              { label: 'Applied', count: appliedCount },
              { label: 'Needs Review', count: needsReviewCount },
            ].map(({ label, count }) => (
              <Chip
                key={label}
                active={selectedStatus === label}
                onClick={() => setSelectedStatus(label)}
              >
                {label} ({count})
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <BookmarkPlus size={36} style={{ color: 'var(--muted)', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
              {savedJobs.length === 0 ? 'No jobs saved yet' : 'No jobs match your filter criteria'}
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: '13px' }}>
              {savedJobs.length === 0
                ? "Dump email job posts or application links here to review and apply when you're ready."
                : 'Try adjusting your search query or switching filters.'}
            </p>
            {savedJobs.length === 0 && (
              <Button variant="primary" onClick={() => setShowQuickSave(true)}>
                <BookmarkPlus size={15} style={{ marginRight: '6px' }} />
                Save Your First Job
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '14px',
          }}
        >
          {filteredJobs.map((job) => {
            const typePill: PillVariant = job.type === 'email' ? 'r' : job.type === 'form' ? 'a' : 'i';
            const statusPill: PillVariant =
              job.status === 'applied' ? 'a' : job.status === 'needs-review' ? 'u' : 'i';

            const displayTitle = job.jobTitle || 'Opportunity';
            const displayCompany = job.company || '';

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                style={{
                  background: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 116, 240, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Card Top Row: Badges & Relative Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pill variant={typePill}>
                      {job.type === 'email' ? '✉️ Email' : job.type === 'form' ? '📋 Form' : '💼 Other'}
                    </Pill>
                    <Pill variant={statusPill}>
                      {job.status === 'applied'
                        ? 'Applied'
                        : job.status === 'needs-review'
                        ? 'Needs Review'
                        : 'To Apply'}
                    </Pill>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    <span>{formatRelativeDate(job.createdAt)}</span>
                  </span>
                </div>

                {/* Card Title & Company */}
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={displayTitle}
                  >
                    {displayTitle}
                  </h4>
                  {displayCompany && (
                    <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '2px' }}>
                      {displayCompany}
                    </div>
                  )}
                </div>

                {/* Summary / Snippet */}
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--muted)',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {job.summary || job.rawText}
                </p>

                {/* 1-Click Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                  {job.applyEmail && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={(e) => handleCopy(e, job.applyEmail!, `${job.id}-email`)}
                      title={`Copy ${job.applyEmail}`}
                    >
                      {copiedKey === `${job.id}-email` ? <Check size={12} style={{ color: '#10B981', marginRight: '4px' }} /> : <Mail size={12} style={{ marginRight: '4px' }} />}
                      <span>{copiedKey === `${job.id}-email` ? 'Copied' : job.applyEmail}</span>
                    </Button>
                  )}

                  {job.requiredSubject && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={(e) => handleCopy(e, job.requiredSubject!, `${job.id}-subj`)}
                      title={`Copy subject: ${job.requiredSubject}`}
                    >
                      {copiedKey === `${job.id}-subj` ? <Check size={12} style={{ color: '#10B981', marginRight: '4px' }} /> : <Copy size={12} style={{ marginRight: '4px' }} />}
                      <span>{copiedKey === `${job.id}-subj` ? 'Copied Subj' : 'Subject'}</span>
                    </Button>
                  )}

                  {job.formLink && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        safeOpenExternalUrl(job.formLink);
                      }}
                      title={`Open form: ${job.formLink}`}
                    >
                      <ExternalLink size={12} style={{ marginRight: '4px' }} />
                      <span>Form</span>
                    </Button>
                  )}
                </div>

                {/* Card Footer Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-glass)',
                  }}
                >
                  <Button
                    type="button"
                    variant={job.status === 'applied' ? 'soft' : 'primary'}
                    size="sm"
                    onClick={(e) => handleToggleStatus(e, job)}
                  >
                    {job.status === 'applied' ? (
                      <>
                        <Check size={13} style={{ marginRight: '4px', color: '#10B981' }} />
                        <span>Applied</span>
                      </>
                    ) : (
                      <span>Mark Applied</span>
                    )}
                  </Button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                      title="View side-by-side extracted & original text"
                    >
                      <Eye size={13} style={{ marginRight: '4px' }} />
                      <span>Details</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={(e) => handleDelete(e, job.id)}
                      title="Delete saved job"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedJob && (
        <SavedJobDetailModal
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          onUpdate={async (id, partial) => {
            await onUpdateJob(id, partial);
            setSelectedJob((prev) => (prev && prev.id === id ? { ...prev, ...partial } : prev));
          }}
          onDelete={onDeleteJob}
          onRerunExtraction={async (id) => {
            await onRerunExtraction(id);
            // Refresh modal selected job from prop list when rerunning
          }}
        />
      )}
    </div>
  );
};
