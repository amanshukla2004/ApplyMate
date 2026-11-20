import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { CertificateRecord } from '../../types/profile';

export interface CertificatesViewProps {
  certificates: CertificateRecord[];
  onSave: (record: CertificateRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  onSave,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CertificateRecord | null>(null);
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [formError, setFormError] = useState('');

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setIssuer('');
    setIssueDate('');
    setCredentialId('');
    setCredentialUrl('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (cert: CertificateRecord) => {
    setEditingItem(cert);
    setName(cert.name);
    setIssuer(cert.issuer);
    setIssueDate(cert.issueDate || '');
    setCredentialId(cert.credentialId || '');
    setCredentialUrl(cert.credentialUrl || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Certificate name is required.');
      return;
    }
    const record: CertificateRecord = {
      id: editingItem?.id || `cert-${Date.now()}`,
      name: name.trim(),
      issuer: issuer.trim(),
      issueDate: issueDate.trim(),
      credentialId: credentialId.trim(),
      credentialUrl: credentialUrl.trim(),
    };
    await onSave(record);
    setModalOpen(false);
  };

  return (
    <div className="view" id="v-certs">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <h2>Licenses & certifications</h2>
        <Button onClick={openAdd}>Add certificate</Button>
      </div>

      <div className="grid2">
        {certificates.length === 0 ? (
          <div className="glass card empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <b>No certificates added yet</b>
            <p className="hint">Add your credentials and certificates to bolster your profile readiness.</p>
          </div>
        ) : (
          certificates.map((cert) => (
            <Card key={cert.id}>
              <h3 style={{ fontSize: '18px' }}>{cert.name}</h3>
              <p style={{ color: 'var(--muted)', marginTop: '2px' }}>{cert.issuer}</p>
              <div className="row" style={{ margin: '10px 0' }}>
                {cert.issueDate && <Pill variant="i">Issued {cert.issueDate}</Pill>}
                {cert.credentialId && <Pill variant="a">ID: {cert.credentialId}</Pill>}
              </div>
              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginBottom: '12px',
                  }}
                >
                  Verify Credential ↗
                </a>
              )}
              <div className="row" style={{ marginTop: '8px' }}>
                <Button size="sm" variant="soft" onClick={() => openEdit(cert)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="soft"
                  className="danger"
                  aria-label={`Remove ${cert.name}`}
                  onClick={() => onDelete(cert.id)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit certificate' : 'Add certificate'}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="stack" style={{ margin: '16px 0' }}>
            <div>
              <label className="f" htmlFor="cert-name">Certificate name *</label>
              <input
                className="in"
                id="cert-name"
                placeholder="e.g. AWS Certified Solutions Architect"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="f" htmlFor="cert-iss">Issuing organization</label>
              <input
                className="in"
                id="cert-iss"
                placeholder="e.g. Amazon Web Services, Meta, Coursera"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </div>
            <div className="grid2" style={{ gap: '10px' }}>
              <div>
                <label className="f" htmlFor="cert-dt">Issue date</label>
                <input
                  className="in"
                  id="cert-dt"
                  placeholder="e.g. Aug 2023"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="f" htmlFor="cert-id">Credential ID</label>
                <input
                  className="in"
                  id="cert-id"
                  placeholder="e.g. ABC-12345"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="f" htmlFor="cert-url">Credential URL</label>
              <input
                className="in"
                id="cert-url"
                type="url"
                placeholder="https://..."
                value={credentialUrl}
                onChange={(e) => setCredentialUrl(e.target.value)}
              />
            </div>
            {formError && <p className="hint err" role="alert">{formError}</p>}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button variant="soft" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
