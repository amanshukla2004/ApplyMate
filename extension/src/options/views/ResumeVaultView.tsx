import React, { useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { Chip } from '../../components/ui/Chip';
import { ResumeRecord } from '../../types/profile';
import { PDFParserService } from '../../services/pdf/pdfParserService';
import { ResumeParserService, ParsedResumeData } from '../../services/pdf/resumeParserService';

export interface ResumeVaultViewProps {
  resumeList: ResumeRecord[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDownload: (resume: ResumeRecord) => void;
  onSetActive: (id: string) => Promise<void>;
  onApplyParsedData?: (data: ParsedResumeData) => Promise<void>;
}

export const ResumeVaultView: React.FC<ResumeVaultViewProps> = ({
  resumeList,
  onUpload,
  onDelete,
  onDownload,
  onSetActive,
  onApplyParsedData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [parsingMessage, setParsingMessage] = useState<string | null>(null);

  const processAndParseFile = async (file: File, autoUpload = true) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15 MB limit. Please select a standard resume PDF under 15 MB.');
      return;
    }

    setIsParsing(true);
    setParsingMessage('Extracting text client-side...');

    try {
      if (autoUpload) {
        await onUpload(file);
      }

      const text = await PDFParserService.extractText(file);
      setParsingMessage('Running heuristic profile extractor...');

      const parsed = ResumeParserService.parse(text);
      setParsedData(parsed);
      setShowPreviewModal(true);
    } catch (err) {
      console.warn('Failed to parse resume:', err);
      alert('Could not parse resume text. You can still fill your profile manually.');
    } finally {
      setIsParsing(false);
      setParsingMessage(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndParseFile(file, true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      await processAndParseFile(file, true);
    }
  };

  const handleParseExistingResume = async (res: ResumeRecord) => {
    if (!res.blobData) {
      alert('No binary data found for this resume.');
      return;
    }
    const file = new File([res.blobData], res.fileName, { type: res.fileType });
    await processAndParseFile(file, false);
  };

  const handleConfirmApply = async () => {
    if (parsedData && onApplyParsedData) {
      await onApplyParsedData(parsedData);
      setShowPreviewModal(false);
      setParsedData(null);
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
        {/* Zero-Cloud Onboarding Banner */}
        <div
          className="glass card"
          style={{
            background: 'linear-gradient(135deg, rgba(233, 226, 255, 0.7), rgba(213, 245, 230, 0.7))',
            borderColor: 'var(--accent)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚡</span>
                <h3 style={{ fontSize: '16px', margin: 0 }}>Instant Profile Onboarding (Zero-Cloud)</h3>
                <Pill variant="m">100% Private</Pill>
              </div>
              <p className="hint" style={{ marginTop: '4px', fontSize: '13px' }}>
                Drop your existing PDF resume here. happlied will automatically extract your contact info, education, experience, and skills directly in your browser without uploading your resume to any cloud server.
              </p>
            </div>
            <Button
              size="sm"
              style={{ whiteSpace: 'nowrap', marginLeft: '16px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? 'Parsing...' : 'Import Resume'}
            </Button>
          </div>
        </div>

        {/* List of Resumes in Vault */}
        {resumeList.map((res) => (
          <Card key={res.id} className="row sp">
            <div>
              <h3 style={{ fontSize: '18px' }}>{res.fileName}</h3>
              <p className="hint">
                {formatSize(res.fileSize)} · uploaded {formatDate(res.uploadedAt)}
              </p>
            </div>
            <div className="row" style={{ gap: '8px' }}>
              {res.isDefault ? (
                <Pill variant="m">Active</Pill>
              ) : (
                <Button variant="soft" size="sm" onClick={() => onSetActive(res.id)}>
                  Set active
                </Button>
              )}
              {res.blobData && (
                <Button
                  variant="soft"
                  size="sm"
                  title="Extract details into profile"
                  onClick={() => handleParseExistingResume(res)}
                  disabled={isParsing}
                >
                  Parse to Profile
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

        {/* Drop Zone */}
        <div
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{ cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <b style={{ color: 'var(--ink)', fontSize: '16px' }}>
            {isParsing ? (parsingMessage || 'Processing PDF...') : 'Drop a Resume PDF here'}
          </b>
          <p style={{ marginTop: '6px' }}>
            {isParsing ? (
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Analyzing text stream in client thread...</span>
            ) : (
              <>
                or <span style={{ textDecoration: 'underline', color: 'var(--accent)', fontWeight: 600 }}>click to browse</span>
              </>
            )}
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

      {/* Review & Confirm Extracted Profile Modal */}
      {showPreviewModal && parsedData && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="✨ Review Extracted Profile Data"
        >
          <div className="stack" style={{ gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
            <p className="hint" style={{ fontSize: '13px' }}>
              Review the fields extracted from your resume. Clicking <strong>Apply to Profile</strong> will automatically update your personal details, education, experience, and skills.
            </p>

            {/* Personal Info Preview */}
            <div className="glass card" style={{ padding: '12px 14px' }}>
              <b style={{ fontSize: '14px' }}>Personal & Contact Details</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                <div><span className="hint">Name:</span> {parsedData.personal.fullName || '—'}</div>
                <div><span className="hint">Email:</span> {parsedData.personal.email || '—'}</div>
                <div><span className="hint">Phone:</span> {parsedData.personal.phone || '—'}</div>
                <div><span className="hint">Location:</span> {[parsedData.address.city, parsedData.address.state, parsedData.address.country].filter(Boolean).join(', ') || '—'}</div>
                <div><span className="hint">LinkedIn:</span> {parsedData.links.linkedInUrl || '—'}</div>
                <div><span className="hint">GitHub:</span> {parsedData.links.githubUrl || '—'}</div>
              </div>
            </div>

            {/* Education Preview */}
            {parsedData.education.length > 0 && (
              <div className="glass card" style={{ padding: '12px 14px' }}>
                <b style={{ fontSize: '14px' }}>Education Detected ({parsedData.education.length})</b>
                {parsedData.education.map((edu, idx) => (
                  <div key={idx} style={{ marginTop: '6px', fontSize: '13px' }}>
                    <strong>{edu.degree}</strong> in {edu.branch} at <em>{edu.institution}</em> ({edu.graduationYear})
                  </div>
                ))}
              </div>
            )}

            {/* Experience Preview */}
            {parsedData.experience.length > 0 && (
              <div className="glass card" style={{ padding: '12px 14px' }}>
                <b style={{ fontSize: '14px' }}>Experience Detected ({parsedData.experience.length})</b>
                {parsedData.experience.map((exp, idx) => (
                  <div key={idx} style={{ marginTop: '6px', fontSize: '13px' }}>
                    <strong>{exp.designation}</strong> at <strong>{exp.companyName}</strong> ({exp.startDate} - {exp.endDate})
                  </div>
                ))}
              </div>
            )}

            {/* Projects Preview */}
            {parsedData.projects && parsedData.projects.length > 0 && (
              <div className="glass card" style={{ padding: '12px 14px' }}>
                <b style={{ fontSize: '14px' }}>Projects Detected ({parsedData.projects.length})</b>
                {parsedData.projects.map((proj, idx) => (
                  <div key={idx} style={{ marginTop: '6px', fontSize: '13px' }}>
                    <strong>{proj.name}</strong>{' '}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className="hint">({proj.technologies.join(', ')})</span>
                    )}
                    {proj.detailedDescription ? (
                      <div className="hint" style={{ fontSize: '12px', marginTop: '2px', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                        {proj.detailedDescription}
                      </div>
                    ) : proj.shortDescription ? (
                      <div className="hint" style={{ fontSize: '12px', marginTop: '2px' }}>
                        {proj.shortDescription}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Skills Preview */}
            {parsedData.skills.length > 0 && (
              <div className="glass card" style={{ padding: '12px 14px' }}>
                <b style={{ fontSize: '14px' }}>Skills Detected ({parsedData.skills.length})</b>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {parsedData.skills.map((sk) => (
                    <Chip key={sk.id} active={false}>
                      {sk.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="row" style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="soft" onClick={() => setShowPreviewModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmApply}>
                Apply to Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
