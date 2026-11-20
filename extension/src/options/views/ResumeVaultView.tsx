import React, { useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { ResumeRecord } from '../../types/profile';

export interface ResumeVaultViewProps {
  resumeList: ResumeRecord[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDownload: (resume: ResumeRecord) => void;
  onSetActive: (id: string) => Promise<void>;
}

export const ResumeVaultView: React.FC<ResumeVaultViewProps> = ({
  resumeList,
  onUpload,
  onDelete,
  onDownload,
  onSetActive,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      await onUpload(file);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="view" id="v-vault">
      <div className="stack">
        {resumeList.map((res) => (
          <Card key={res.id} className="row sp">
            <div>
              <h3 style={{ fontSize: '18px' }}>{res.fileName}</h3>
              <p className="hint">
                {formatSize(res.fileSize)} · uploaded {formatDate(res.uploadedAt)}
              </p>
            </div>
            <div className="row">
              {res.isDefault ? (
                <Pill variant="m">Active</Pill>
              ) : (
                <Button variant="soft" size="sm" onClick={() => onSetActive(res.id)}>
                  Set active
                </Button>
              )}
              <Button variant="soft" size="sm" onClick={() => onDownload(res)}>
                Download
              </Button>
              <Button
                variant="soft"
                size="sm"
                aria-label={`Delete ${res.fileName}`}
                onClick={() => onDelete(res.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}

        <div
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <b style={{ color: 'var(--ink)', fontSize: '16px' }}>Drop a PDF here</b>
          <p style={{ marginTop: '6px' }}>
            or{' '}
            <Button
              size="sm"
              style={{ marginLeft: '4px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};
