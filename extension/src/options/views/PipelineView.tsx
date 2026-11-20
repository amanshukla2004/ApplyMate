import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Pill } from '../../components/ui/Pill';
import { ApplicationRecord, ApplicationStatus } from '../../types/profile';

export interface PipelineViewProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => Promise<void>;
}

const COLUMNS: { key: ApplicationStatus; label: string; pillVariant: 'i' | 'a' | 'r' | 'm' | 'u' }[] = [
  { key: 'Saved', label: 'Saved', pillVariant: 'i' },
  { key: 'Applied', label: 'Applied', pillVariant: 'a' },
  { key: 'Interview', label: 'Interview', pillVariant: 'r' },
  { key: 'Offer', label: 'Offer', pillVariant: 'm' },
  { key: 'Rejected', label: 'Rejected', pillVariant: 'u' },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  applications,
  onUpdateStatus,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null);

  const filteredApps = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.companyName || '').toLowerCase().includes(q) ||
      (app.jobTitle || '').toLowerCase().includes(q)
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

  return (
    <div className="view" id="v-pipeline">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <div className="row">
          <input
            className="in"
            style={{ width: '240px' }}
            placeholder="Search company or role..."
            aria-label="Search applications"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Pill variant="a">All {applications.length}</Pill>
        </div>

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

      {viewMode === 'board' ? (
        <div className="board">
          {COLUMNS.map((col) => {
            const colApps = filteredApps.filter((a) => a.status === col.key);
            const isOver = overCol === col.key;

            return (
              <div
                key={col.key}
                className={`col glass ${isOver ? 'over' : ''}`}
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
                  return (
                    <div
                      key={app.id}
                      className={`job ${isDragging ? 'drag' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onDragEnd={() => setDraggedId(null)}
                    >
                      <b>{app.companyName || 'Company'}</b>
                      <span>{app.jobTitle || 'Role'}</span>
                      <small>{formatRelativeDate(app.applicationDate)}</small>
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
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
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
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                    No applications match your search.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const col = COLUMNS.find((c) => c.key === app.status) || COLUMNS[0];
                  return (
                    <tr key={app.id}>
                      <td><b>{app.companyName || 'Company'}</b></td>
                      <td>{app.jobTitle || 'Role'}</td>
                      <td>{formatRelativeDate(app.applicationDate)}</td>
                      <td>
                        <Pill variant={col.pillVariant}>{col.label}</Pill>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
