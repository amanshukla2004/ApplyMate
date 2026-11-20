import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { ExperienceRecord } from '../../types/profile';

export interface ExperienceViewProps {
  experienceList: ExperienceRecord[];
  onSave: (record: ExperienceRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ExperienceView: React.FC<ExperienceViewProps> = ({
  experienceList,
  onSave,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExperienceRecord | null>(null);
  const [formError, setFormError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  const openAdd = () => {
    setEditingItem(null);
    setCompanyName('');
    setDesignation('');
    setDuration('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (exp: ExperienceRecord) => {
    setEditingItem(exp);
    setCompanyName(exp.companyName);
    setDesignation(exp.designation);
    setDuration(exp.startDate ? `${exp.startDate} – ${exp.endDate || 'Present'}` : '');
    setDescription(exp.description || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }

    const parts = duration.split('–').map((s) => s.trim());
    const isPresent = !parts[1] || parts[1].toLowerCase() === 'present';
    const record: ExperienceRecord = {
      id: editingItem?.id || `exp-${Date.now()}`,
      companyName: companyName.trim(),
      designation: designation.trim(),
      employmentType: 'Full-time',
      startDate: parts[0] || '',
      endDate: isPresent ? undefined : parts[1],
      currentlyWorking: isPresent,
      description: description.trim(),
      technologies: editingItem?.technologies || [],
    };

    await onSave(record);
    setModalOpen(false);
  };

  return (
    <div className="view" id="v-exp">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <h2>Work experience</h2>
        <Button onClick={openAdd}>Add experience</Button>
      </div>

      <div className="grid2">
        {experienceList.length === 0 ? (
          <div className="glass card empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <b>Nothing here yet</b>
            <p className="hint">Add your internships or full-time roles.</p>
          </div>
        ) : (
          experienceList.map((exp) => (
            <Card key={exp.id}>
              <h3 style={{ fontSize: '18px' }}>{exp.companyName}</h3>
              <p style={{ color: 'var(--muted)' }}>{exp.designation}</p>
              <div className="row" style={{ margin: '10px 0' }}>
                {(exp.startDate || exp.endDate) && (
                  <Pill variant="a">
                    {exp.startDate} – {exp.endDate || 'Present'}
                  </Pill>
                )}
              </div>
              {exp.description && (
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '8px 0' }}>
                  {exp.description}
                </p>
              )}
              <div className="row" style={{ marginTop: '12px' }}>
                <Button variant="soft" size="sm" onClick={() => openEdit(exp)}>
                  Edit
                </Button>
                <Button
                  variant="soft"
                  size="sm"
                  aria-label={`Remove ${exp.companyName}`}
                  onClick={() => onDelete(exp.id)}
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
        title={editingItem ? 'Edit experience' : 'Add experience'}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="stack" style={{ margin: '16px 0' }}>
            <div>
              <label className="f" htmlFor="exp-co">Company *</label>
              <input
                className="in"
                id="exp-co"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="f" htmlFor="exp-ti">Designation</label>
              <input
                className="in"
                id="exp-ti"
                placeholder="e.g. Frontend Engineer, SDE 1"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="exp-dur">Duration</label>
              <input
                className="in"
                id="exp-dur"
                placeholder="e.g. Jun 2025 – Present"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="exp-desc">Responsibilities / Highlights</label>
              <textarea
                className="in"
                id="exp-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
