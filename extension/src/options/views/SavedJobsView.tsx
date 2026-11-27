import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { SavedJobRecord, SavedJobStatus } from '../../types/savedJob';
import { SavedJobDetailModal } from './SavedJobDetailModal';
import { safeOpenExternalUrl, safeCopyToClipboard } from '../../utils/security';
import {
  BookmarkPlus,
  Search,
  Copy,
  ExternalLink,
  Check,
  Trash2,
  Eye,
  Sparkles,
  Phone,
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
    const nextStatus: SavedJobStatus =
      job.status === 'applied' ? 'to-apply' : job.status === 'to-apply' ? 'review' : 'applied';
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
      (job.jobDescription || '').toLowerCase().includes(q) ||
      job.rawText.toLowerCase().includes(q)
    );
  });

  const totalCount = savedJobs.length;
  const toApplyCount = savedJobs.filter((j) => j.status === 'to-apply').length;
  const appliedCount = savedJobs.filter((j) => j.status === 'applied').length;
  const reviewCount = savedJobs.filter((j) => j.status === 'review' || j.status === 'needs-review').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              Saved Job List
            </h2>
            <span
              style={{
                background: '#AEAC78',
                color: '#FCF0DA',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {totalCount} saved
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13.5px' }}>
            Extracted opportunities, emails, and forms ready for one-click action.
          </p>
        </div>

        <button
          onClick={() => setShowQuickSave(!showQuickSave)}
          style={{
            background: '#4C4541',
            color: '#FCF0DA',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(76, 69, 65, 0.15)',
          }}
        >
          <BookmarkPlus size={16} />
          <span>{showQuickSave ? 'Close Box' : 'Quick Save Job'}</span>
        </button>
      </div>

      {/* Inline Quick Save Form */}
      {showQuickSave && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #AEAC78',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(76, 69, 65, 0.08)',
          }}
        >
          <form onSubmit={handleQuickSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#4C4541' }}>
                Paste Raw Job Details, Email Application, or Form Link
              </span>
              <span style={{ fontSize: '11px', color: '#756C67', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} color="#F2C46A" />
                <span>Zero-loss local storage + Structured extraction</span>
              </span>
            </div>

            <textarea
              rows={4}
              value={quickSaveText}
              onChange={(e) => setQuickSaveText(e.target.value)}
              placeholder="Paste any job posting text, email instructions ('Email resume to jobs@xyz.com with subject Application - Role'), or Google Form / Lever / Ashby link..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #AEAC78',
                background: '#FCF0DA',
                fontSize: '13px',
                color: '#4C4541',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowQuickSave(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(76, 69, 65, 0.2)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  color: '#4C4541',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!quickSaveText.trim() || isSaving}
                style={{
                  background: '#4C4541',
                  color: '#FCF0DA',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: quickSaveText.trim() && !isSaving ? 'pointer' : 'not-allowed',
                }}
              >
                {isSaving ? 'Saving...' : 'Save & Extract'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved jobs by title, company, email, subject, or keywords..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1px solid rgba(76, 69, 65, 0.2)',
              background: '#FFFFFF',
              color: 'var(--ink)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          {/* Category Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Type:</span>
            {['All', 'Email', 'Form', 'Phone', 'Other'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                style={{
                  border: selectedType === type ? '1.5px solid #AEAC78' : '1px solid rgba(76, 69, 65, 0.15)',
                  background: selectedType === type ? '#EAEBD9' : '#FFFFFF',
                  color: selectedType === type ? '#4C4541' : '#756C67',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  fontSize: '11.5px',
                  fontWeight: selectedType === type ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Status:</span>
            {[
              { label: 'All', count: totalCount },
              { label: 'To Apply', count: toApplyCount },
              { label: 'Review', count: reviewCount },
              { label: 'Applied', count: appliedCount },
            ].map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setSelectedStatus(label)}
                style={{
                  border: selectedStatus === label ? '1.5px solid #F2C46A' : '1px solid rgba(76, 69, 65, 0.15)',
                  background: selectedStatus === label ? '#FDF1D6' : '#FFFFFF',
                  color: selectedStatus === label ? '#4C4541' : '#756C67',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  fontSize: '11.5px',
                  fontWeight: selectedStatus === label ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE VIEW: [job title][company][deadline][quick action][time][status][open] */}
      {filteredJobs.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px dashed rgba(76, 69, 65, 0.25)',
            borderRadius: '14px',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <BookmarkPlus size={36} style={{ color: '#AEAC78', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#4C4541' }}>
            No saved jobs match your filter
          </h3>
          <p style={{ margin: '0 0 16px', color: '#756C67', fontSize: '13px' }}>
            Use the "Save this Job" button on any webpage or paste a job posting above.
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowQuickSave(true)}>
            + Add Your First Saved Job
          </Button>
        </div>
      ) : (
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Job Title</th>
                <th style={{ minWidth: '140px' }}>Company</th>
                <th style={{ minWidth: '110px' }}>Deadline</th>
                <th style={{ minWidth: '180px' }}>Quick Action</th>
                <th style={{ minWidth: '90px' }}>Time</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const categoryLabel = job.type ? job.type.toUpperCase() : 'OTHER';
                let categoryBg = '#F3F4F6';
                let categoryColor = '#4B5563';
                if (job.type === 'email') {
                  categoryBg = '#FDF1D6';
                  categoryColor = '#B45309';
                } else if (job.type === 'form') {
                  categoryBg = '#EAEBD9';
                  categoryColor = '#166534';
                } else if (job.type === 'phone') {
                  categoryBg = '#E0F2FE';
                  categoryColor = '#0369A1';
                }

                const isApplied = job.status === 'applied';
                const isReview = job.status === 'review' || job.status === 'needs-review';

                return (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* [job title] */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: categoryBg,
                              color: categoryColor,
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {categoryLabel}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '13.5px',
                              color: 'var(--ink)',
                              lineHeight: 1.3,
                            }}
                          >
                            {job.jobTitle || 'Opportunity'}
                          </span>
                        </div>
                        {job.summary && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '240px',
                            }}
                          >
                            {job.summary}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* [company] */}
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                        {job.company || '—'}
                      </span>
                    </td>

                    {/* [deadline] */}
                    <td>
                      {job.deadline ? (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#B45309',
                            background: '#FDF1D6',
                            padding: '2px 7px',
                            borderRadius: '5px',
                          }}
                        >
                          {job.deadline}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* [quick action: (link to form/ copies email)] */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {job.formLink && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              safeOpenExternalUrl(job.formLink!);
                            }}
                            title="Open application form link"
                            style={{
                              background: '#EAEBD9',
                              border: '1px solid #AEAC78',
                              color: '#4C4541',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ExternalLink size={11} />
                            <span>Form</span>
                          </button>
                        )}

                        {job.applyEmail && (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, job.applyEmail!, `email-${job.id}`)}
                            title={`Copy email: ${job.applyEmail}`}
                            style={{
                              background: '#FCF0DA',
                              border: '1px solid #AEAC78',
                              color: '#4C4541',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedKey === `email-${job.id}` ? (
                              <Check size={11} color="#10B981" />
                            ) : (
                              <Copy size={11} />
                            )}
                            <span>{copiedKey === `email-${job.id}` ? 'Copied' : 'Email'}</span>
                          </button>
                        )}

                        {job.applyPhone && (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, job.applyPhone!, `phone-${job.id}`)}
                            title={`Copy phone: ${job.applyPhone}`}
                            style={{
                              background: '#E0F2FE',
                              border: '1px solid #7DD3FC',
                              color: '#0369A1',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedKey === `phone-${job.id}` ? (
                              <Check size={11} color="#10B981" />
                            ) : (
                              <Phone size={11} />
                            )}
                            <span>{copiedKey === `phone-${job.id}` ? 'Copied' : 'Phone'}</span>
                          </button>
                        )}

                        {!job.formLink && !job.applyEmail && !job.applyPhone && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No quick link</span>
                        )}
                      </div>
                    </td>

                    {/* [time] */}
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {formatRelativeDate(job.createdAt)}
                      </span>
                    </td>

                    {/* [status] */}
                    <td>
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(e, job)}
                        title="Click to toggle status (To Apply / Review / Applied)"
                        style={{
                          background: isApplied ? '#EAEBD9' : isReview ? '#FDF1D6' : '#FCF0DA',
                          color: isApplied ? '#166534' : isReview ? '#B45309' : '#4C4541',
                          border: `1px solid ${isApplied ? '#AEAC78' : isReview ? '#F2C46A' : 'rgba(76, 69, 65, 0.2)'}`,
                          borderRadius: '999px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isApplied ? 'Applied ✓' : isReview ? 'Needs Review' : 'To Apply'}
                      </button>
                    </td>

                    {/* [open] */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(76, 69, 65, 0.2)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#4C4541',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={12} />
                          <span>Open</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, job.id)}
                          title="Delete"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: '4px',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            setSelectedJob((prev) => (prev ? { ...prev, ...partial } : null));
          }}
          onDelete={onDeleteJob}
          onRerunExtraction={onRerunExtraction}
        />
      )}
    </div>
  );
};
