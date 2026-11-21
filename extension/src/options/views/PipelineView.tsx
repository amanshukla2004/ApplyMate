import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Pill, PillVariant } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ApplicationRecord, ApplicationStatus } from '../../types/profile';
import { applicationService } from '../../services/applicationService';

export interface PipelineViewProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => Promise<void>;
  onSaveApplication?: (record: ApplicationRecord) => Promise<void>;
  onDeleteApplication?: (id: string) => Promise<void>;
}

const COLUMNS: { key: ApplicationStatus; label: string; pillVariant: PillVariant }[] = [
  { key: 'Saved', label: 'Saved', pillVariant: 'i' },
  { key: 'Applied', label: 'Applied', pillVariant: 'a' },
  { key: 'Interview', label: 'Interview', pillVariant: 'r' },
  { key: 'Offer', label: 'Offer', pillVariant: 'm' },
  { key: 'Rejected', label: 'Rejected', pillVariant: 'u' },
];

const PLATFORMS = [
  'All',
  'Greenhouse',
  'Lever',
  'Workday',
  'Ashby',
  'LinkedIn',
  'Google Forms',
  'Indeed',
  'SmartRecruiters',
  'Company Portal',
];

const getPlatformBadgeColor = (platform: string): { bg: string; color: string; border: string } => {
  const p = platform.toLowerCase();
  if (p.includes('greenhouse')) return { bg: 'rgba(23, 104, 74, 0.12)', color: '#17684A', border: 'rgba(23, 104, 74, 0.3)' };
  if (p.includes('lever')) return { bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', border: 'rgba(217, 119, 6, 0.3)' };
  if (p.includes('workday')) return { bg: 'rgba(2, 132, 199, 0.12)', color: '#0369a1', border: 'rgba(2, 132, 199, 0.3)' };
  if (p.includes('ashby')) return { bg: 'rgba(139, 116, 240, 0.15)', color: '#6d4aff', border: 'rgba(139, 116, 240, 0.4)' };
  if (p.includes('linkedin')) return { bg: 'rgba(10, 102, 194, 0.12)', color: '#0a66c2', border: 'rgba(10, 102, 194, 0.3)' };
  if (p.includes('google')) return { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.3)' };
  return { bg: 'rgba(43, 35, 64, 0.08)', color: 'var(--ink)', border: 'rgba(43, 35, 64, 0.15)' };
};

export const PipelineView: React.FC<PipelineViewProps> = ({
  applications,
  onUpdateStatus,
  onSaveApplication,
  onDeleteApplication,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null);

  // Add Job Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalCompany, setModalCompany] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlatform, setModalPlatform] = useState('Greenhouse');
  const [modalStatus, setModalStatus] = useState<ApplicationStatus>('Applied');
  const [modalJobUrl, setModalJobUrl] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  const getPlatform = (app: ApplicationRecord): string => {
    if (app.platform) return app.platform;
    return applicationService.detectPlatformFromUrl(app.jobUrl);
  };

  const filteredApps = applications.filter((app) => {
    const platform = getPlatform(app);
    const matchesPlatform = selectedPlatform === 'All' || platform.toLowerCase() === selectedPlatform.toLowerCase();
    if (!matchesPlatform) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.companyName || '').toLowerCase().includes(q) ||
      (app.jobTitle || '').toLowerCase().includes(q) ||
      platform.toLowerCase().includes(q)
    );
  });

  const formatRelativeDate = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetCol: ApplicationStatus) => {
    e.preventDefault();
    setOverCol(null);
    const id = draggedId || e.dataTransfer.getData('text/plain');
    if (id) {
      await onUpdateStatus(id, targetCol);
    }
    setDraggedId(null);
  };

  const handleExportCSV = () => {
    const csvContent = applicationService.exportToCSV(applications);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `happlymate_pipeline_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCompany.trim() || !modalTitle.trim()) return;

    const now = new Date();
    const newRecord: ApplicationRecord = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companyName: modalCompany.trim(),
      jobTitle: modalTitle.trim(),
      platform: modalPlatform,
      status: modalStatus,
      jobUrl: modalJobUrl.trim(),
      notes: modalNotes.trim(),
      applicationDate: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (onSaveApplication) {
      await onSaveApplication(newRecord);
    } else {
      await applicationService.saveApplication(newRecord);
    }

    setModalCompany('');
    setModalTitle('');
    setModalJobUrl('');
    setModalNotes('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="view" id="v-pipeline">
      <div className="row sp" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="row" style={{ gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="in"
            style={{ width: '220px' }}
            placeholder="Search company or role..."
            aria-label="Search applications"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="in"
            style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            aria-label="Filter by ATS Platform"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === 'All' ? 'All Platforms' : p}
              </option>
            ))}
          </select>

          <Pill variant="a">Matched: {filteredApps.length}</Pill>
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Application
          </Button>

          <Button
            variant="soft"
            size="sm"
            onClick={handleExportCSV}
            title="Export all tracked applications to CSV"
          >
            Export CSV
          </Button>

          <div className="seg glass" role="group" aria-label="View toggle">
            <button
              type="button"
              aria-pressed={viewMode === 'board'}
              onClick={() => setViewMode('board')}
            >
              Board
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'table'}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div
          className="board"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            alignItems: 'start',
          }}
        >
          {COLUMNS.map((col) => {
            const colApps = filteredApps.filter((a) => a.status === col.key);
            const isOver = overCol === col.key;

            return (
              <div
                key={col.key}
                className={`col glass ${isOver ? 'over' : ''}`}
                style={{ minHeight: '340px' }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.key);
                }}
                onDragLeave={() => setOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <h3>
                  {col.label}
                  <Pill variant={col.pillVariant}>{colApps.length}</Pill>
                </h3>

                {colApps.map((app) => {
                  const isDragging = draggedId === app.id;
                  const platformName = getPlatform(app);
                  const pStyle = getPlatformBadgeColor(platformName);

                  return (
                    <div
                      key={app.id}
                      className={`job ${isDragging ? 'drag' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onDragEnd={() => setDraggedId(null)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <b>{app.companyName || 'Company'}</b>
                        {onDeleteApplication && (
                          <button
                            type="button"
                            onClick={() => onDeleteApplication(app.id)}
                            title="Remove application"
                            style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <span>{app.jobTitle || 'Role'}</span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', flexWrap: 'wrap' }}>
                        <small>{formatRelativeDate(app.applicationDate)}</small>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>•</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: pStyle.bg,
                            color: pStyle.color,
                            border: `1px solid ${pStyle.border}`,
                          }}
                          title={`Applied via ${platformName}`}
                        >
                          {platformName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <Pill
                          variant={col.pillVariant}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {col.label}
                        </Pill>

                        <select
                          aria-label={`Move ${app.companyName} status`}
                          value={app.status}
                          onChange={(e) =>
                            onUpdateStatus(app.id, e.target.value as ApplicationStatus)
                          }
                          style={{ fontSize: '11px', padding: '2px 4px' }}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <table className="table-view">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Platform</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                    No applications match your search.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const col = COLUMNS.find((c) => c.key === app.status) || COLUMNS[0];
                  const platformName = getPlatform(app);
                  const pStyle = getPlatformBadgeColor(platformName);

                  return (
                    <tr key={app.id}>
                      <td><b>{app.companyName || 'Company'}</b></td>
                      <td>{app.jobTitle || 'Role'}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: pStyle.bg,
                            color: pStyle.color,
                            border: `1px solid ${pStyle.border}`,
                            display: 'inline-block',
                          }}
                        >
                          {platformName}
                        </span>
                      </td>
                      <td>{formatRelativeDate(app.applicationDate)}</td>
                      <td>
                        <Pill variant={col.pillVariant}>{col.label}</Pill>
                      </td>
                      <td>
                        <select
                          aria-label={`Change ${app.companyName} status`}
                          value={app.status}
                          onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                          style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Manual Application Entry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Job Application"
      >
        <form onSubmit={handleSaveModal} className="stack" style={{ gap: '12px' }}>
          <div>
            <label className="f">Company Name *</label>
            <input
              className="in"
              required
              placeholder="e.g. OpenAI, Stripe, Google"
              value={modalCompany}
              onChange={(e) => setModalCompany(e.target.value)}
            />
          </div>

          <div>
            <label className="f">Job Title *</label>
            <input
              className="in"
              required
              placeholder="e.g. Senior Software Engineer"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
            />
          </div>

          <div className="row sp" style={{ gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label className="f">ATS / Portal Platform</label>
              <select
                className="in"
                value={modalPlatform}
                onChange={(e) => setModalPlatform(e.target.value)}
              >
                {PLATFORMS.filter((p) => p !== 'All').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="f">Initial Stage</label>
              <select
                className="in"
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as ApplicationStatus)}
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="f">Job Posting URL (Optional)</label>
            <input
              className="in"
              type="url"
              placeholder="https://..."
              value={modalJobUrl}
              onChange={(e) => setModalJobUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="f">Notes (Optional)</label>
            <textarea
              className="in"
              rows={2}
              placeholder="e.g. Referral from Jane, salary range $180k-$210k"
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
            />
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              type="button"
              variant="soft"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
