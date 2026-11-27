import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ApplicationRecord, ApplicationStatus } from '../../types/profile';
import { SavedJobRecord } from '../../types/savedJob';
import { applicationService } from '../../services/applicationService';
import { safeOpenExternalUrl, safeCopyToClipboard } from '../../utils/security';
import {
  Search,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Download,
  Copy,
  Check,
  Building2,
  Briefcase,
} from 'lucide-react';

export interface PipelineViewProps {
  applications: ApplicationRecord[];
  savedJobs?: SavedJobRecord[];
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => Promise<void>;
  onSaveApplication?: (record: ApplicationRecord) => Promise<void>;
  onDeleteApplication?: (id: string) => Promise<void>;
  onDeleteSavedJob?: (id: string) => Promise<void>;
}

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
  'Direct Email',
];

interface UnifiedPipelineItem {
  id: string;
  source: 'application' | 'saved-job';
  company: string;
  role: string;
  platform: string;
  date: string;
  status: ApplicationStatus;
  jobUrl?: string;
  description?: string;
  originalRecord: ApplicationRecord | SavedJobRecord;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  applications,
  savedJobs = [],
  onUpdateStatus,
  onSaveApplication,
  onDeleteApplication,
  onDeleteSavedJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Add Job Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalCompany, setModalCompany] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlatform, setModalPlatform] = useState('Greenhouse');
  const [modalStatus, setModalStatus] = useState<ApplicationStatus>('Applied');
  const [modalJobUrl, setModalJobUrl] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Job Description Viewer Modal
  const [activeDescItem, setActiveDescItem] = useState<UnifiedPipelineItem | null>(null);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // 1. Applications from tracker
  const trackerItems: UnifiedPipelineItem[] = applications.map((app) => ({
    id: app.id,
    source: 'application',
    company: app.companyName || 'Unknown Company',
    role: app.jobTitle || 'Role',
    platform: app.platform || applicationService.detectPlatformFromUrl(app.jobUrl),
    date: app.applicationDate || app.createdAt || new Date().toISOString(),
    status: app.status || 'Applied',
    jobUrl: app.jobUrl,
    description: app.notes,
    originalRecord: app,
  }));

  // 2. Saved Jobs that were marked as 'applied'
  const appliedSavedJobs: UnifiedPipelineItem[] = savedJobs
    .filter((j) => j.status === 'applied')
    // Avoid duplicates if matching company and title already in applications
    .filter(
      (sj) =>
        !applications.some(
          (a) =>
            a.companyName?.toLowerCase() === (sj.company || '').toLowerCase() &&
            a.jobTitle?.toLowerCase() === (sj.jobTitle || '').toLowerCase()
        )
    )
    .map((sj) => ({
      id: sj.id,
      source: 'saved-job',
      company: sj.company || 'Saved Opportunity',
      role: sj.jobTitle || 'Job Role',
      platform: sj.formLink
        ? applicationService.detectPlatformFromUrl(sj.formLink)
        : sj.applyEmail
        ? 'Direct Email'
        : 'Saved Job',
      date: sj.createdAt,
      status: 'Applied',
      jobUrl: sj.formLink || undefined,
      description: sj.jobDescription || sj.summary || sj.rawText || undefined,
      originalRecord: sj,
    }));

  const allItems: UnifiedPipelineItem[] = [...trackerItems, ...appliedSavedJobs];

  const filteredItems = allItems.filter((item) => {
    // Platform filter
    if (selectedPlatform !== 'All' && item.platform.toLowerCase() !== selectedPlatform.toLowerCase()) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'All' && item.status !== selectedStatus) {
      return false;
    }
    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.company.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      item.platform.toLowerCase().includes(q)
    );
  });

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${count} selected application${count > 1 ? 's' : ''}?`
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const item = allItems.find((u) => u.id === id);
        if (item?.source === 'application') {
          if (onDeleteApplication) {
            await onDeleteApplication(id);
          } else {
            await applicationService.deleteApplication(id);
          }
        } else if (item?.source === 'saved-job') {
          if (onDeleteSavedJob) {
            await onDeleteSavedJob(id);
          }
        }
      }
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteItem = async (item: UnifiedPipelineItem) => {
    if (!window.confirm(`Delete application entry for "${item.role} at ${item.company}"?`)) {
      return;
    }

    if (item.source === 'application') {
      if (onDeleteApplication) {
        await onDeleteApplication(item.id);
      } else {
        await applicationService.deleteApplication(item.id);
      }
    } else {
      if (onDeleteSavedJob) {
        await onDeleteSavedJob(item.id);
      }
    }
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

  const handleExportCSV = () => {
    const csvContent = applicationService.exportToCSV(applications);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `happlied_applications_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopyDesc = async (text: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
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
              Application Tracker
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
              {allItems.length} active
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13.5px' }}>
            Table view tracker of your sent applications and moved applied jobs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: '#4C4541',
              color: '#FCF0DA',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(76, 69, 65, 0.15)',
            }}
          >
            <Plus size={16} />
            <span>Add Applied Job</span>
          </button>

          <Button variant="soft" size="sm" onClick={handleExportCSV}>
            <Download size={14} style={{ marginRight: '5px' }} />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
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
            placeholder="Search company or role in tracker..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12.5px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'All Platforms' : p}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12.5px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Applied">Applied</option>
          <option value="Interview">Interview</option>
          <option value="Offer">Offer</option>
          <option value="Rejected">Rejected</option>
          <option value="Saved">Saved</option>
        </select>
      </div>

      {/* Bulk Selection Action Banner */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'var(--hover)',
            border: '1.5px solid var(--accent-active)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              {selectedIds.size} of {filteredItems.length} application{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text)',
              }}
            >
              Deselect All
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isBulkDeleting ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)',
              }}
            >
              <Trash2 size={14} />
              <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* TABLE VIEW ONLY */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: '14px',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <Briefcase size={36} style={{ color: '#AEAC78', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
            No applied jobs in tracker yet
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Mark saved jobs as "Applied" or click "Add Applied Job" to track submissions here.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            + Add First Applied Job
          </Button>
        </div>
      ) : (
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th style={{ width: '42px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all applications"
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      accentColor: '#AEAC78',
                    }}
                  />
                </th>
                <th style={{ minWidth: '160px' }}>Company</th>
                <th style={{ minWidth: '180px' }}>Role</th>
                <th style={{ minWidth: '120px' }}>Platform</th>
                <th style={{ minWidth: '110px' }}>Date</th>
                <th style={{ minWidth: '130px' }}>Status</th>
                <th style={{ minWidth: '150px' }}>Job Description</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                let statusBg = '#EAEBD9';
                let statusText = '#166534';
                let statusBorder = '#AEAC78';

                if (item.status === 'Interview') {
                  statusBg = '#FDF1D6';
                  statusText = '#B45309';
                  statusBorder = '#F2C46A';
                } else if (item.status === 'Offer') {
                  statusBg = '#DCFCE7';
                  statusText = '#15803D';
                  statusBorder = '#86EFAC';
                } else if (item.status === 'Rejected') {
                  statusBg = '#FEE2E2';
                  statusText = '#991B1B';
                  statusBorder = '#FCA5A5';
                }

                const isSelected = selectedIds.has(item.id);

                return (
                  <tr
                    key={`${item.source}-${item.id}`}
                    style={{
                      background: isSelected ? 'var(--hover)' : undefined,
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ width: '42px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        aria-label={`Select ${item.role} at ${item.company}`}
                        style={{
                          cursor: 'pointer',
                          width: '16px',
                          height: '16px',
                          accentColor: '#AEAC78',
                        }}
                      />
                    </td>

                    {/* Company */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={15} style={{ color: '#AEAC78', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                          {item.company}
                        </span>
                        {item.source === 'saved-job' && (
                          <span
                            title="Synced from Saved Jobs"
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: 'var(--hover)',
                              border: '1px solid var(--accent-active)',
                              color: 'var(--text)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            Saved Job
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                          {item.role}
                        </span>
                        {item.jobUrl && (
                          <a
                            href={item.jobUrl}
                            onClick={(e) => {
                              e.preventDefault();
                              safeOpenExternalUrl(item.jobUrl!);
                            }}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '11px',
                              color: '#3B82F6',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              textDecoration: 'underline',
                            }}
                          >
                            <span>Job Link</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Platform */}
                    <td>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: 'var(--hover)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {item.platform}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDisplayDate(item.date)}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      {item.source === 'application' ? (
                        <select
                          value={item.status}
                          onChange={(e) =>
                            onUpdateStatus(item.id, e.target.value as ApplicationStatus)
                          }
                          style={{
                            background: statusBg,
                            color: statusText,
                            border: `1px solid ${statusBorder}`,
                            borderRadius: '999px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Saved">Saved</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            background: statusBg,
                            color: statusText,
                            border: `1px solid ${statusBorder}`,
                            borderRadius: '999px',
                            padding: '3px 9px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-block',
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                    </td>

                    {/* Job Description Option */}
                    <td>
                      {item.description ? (
                        <button
                          type="button"
                          onClick={() => setActiveDescItem(item)}
                          style={{
                            background: 'var(--hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            borderRadius: '6px',
                            padding: '4px 9px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <FileText size={12} style={{ color: 'var(--accent-active)' }} />
                          <span>View Description</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>No description</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        title="Delete application entry"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '4px',
                          display: 'inline-grid',
                          placeItems: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Job Description Modal */}
      {activeDescItem && (
        <Modal
          isOpen={Boolean(activeDescItem)}
          onClose={() => setActiveDescItem(null)}
          title={`Job Description - ${activeDescItem.role} at ${activeDescItem.company}`}
          maxWidth="680px"
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                Platform: {activeDescItem.platform} • Applied: {formatDisplayDate(activeDescItem.date)}
              </span>
              <button
                onClick={() => handleCopyDesc(activeDescItem.description || '')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #AEAC78',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copiedDesc ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                <span>{copiedDesc ? 'Copied' : 'Copy Description'}</span>
              </button>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(76, 69, 65, 0.15)',
                borderRadius: '10px',
                padding: '14px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontSize: '12.5px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                color: '#4C4541',
              }}
            >
              {activeDescItem.description}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveDescItem(null)}
                style={{
                  background: '#4C4541',
                  color: '#FCF0DA',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Job Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Applied Job to Pipeline"
          maxWidth="540px"
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid var(--border)',
          }}
        >
          <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                Company Name *
              </label>
              <input
                type="text"
                required
                value={modalCompany}
                onChange={(e) => setModalCompany(e.target.value)}
                placeholder="e.g. Stripe, Linear, Google"
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                Job Title *
              </label>
              <input
                type="text"
                required
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                  Platform / ATS
                </label>
                <select
                  value={modalPlatform}
                  onChange={(e) => setModalPlatform(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #AEAC78',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {PLATFORMS.filter((p) => p !== 'All').map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                  Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as ApplicationStatus)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #AEAC78',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Saved">Saved</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                Job Posting URL
              </label>
              <input
                type="url"
                value={modalJobUrl}
                onChange={(e) => setModalJobUrl(e.target.value)}
                placeholder="https://jobs.lever.co/company/..."
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#756C67' }}>
                Job Description / Notes
              </label>
              <textarea
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Key requirements, recruiter contacts, or application notes..."
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #AEAC78',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(76, 69, 65, 0.2)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  color: '#4C4541',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: '#4C4541',
                  color: '#FCF0DA',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Add Application
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
