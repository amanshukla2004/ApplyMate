import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { EducationRecord } from '../../types/profile';

export interface EducationViewProps {
  educationList: EducationRecord[];
  onSave: (record: EducationRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EducationView: React.FC<EducationViewProps> = ({
  educationList,
  onSave,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EducationRecord | null>(null);
  const [formError, setFormError] = useState('');

  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [startYear, setStartYear] = useState('');
  const [graduationYear, setGraduationYear] = useState('');

  const openAdd = () => {
    setEditingItem(null);
    setInstitution('');
    setDegree('');
    setBranch('');
    setCgpa('');
    setStartYear('');
    setGraduationYear('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (edu: EducationRecord) => {
    setEditingItem(edu);
    setInstitution(edu.institution);
    setDegree(edu.degree);
    setBranch(edu.branch || '');
    setCgpa(edu.cgpa || '');
    setStartYear(edu.startYear || '');
    setGraduationYear(edu.graduationYear || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim()) {
      setFormError('Institution name is required.');
      return;
    }

    const record: EducationRecord = {
      id: editingItem?.id || `edu-${Date.now()}`,
      institution: institution.trim(),
      degree: degree.trim(),
      branch: branch.trim(),
      cgpa: cgpa.trim(),
      startYear: startYear.trim(),
      graduationYear: graduationYear.trim(),
    };

    await onSave(record);
    setModalOpen(false);
  };

  return (
    <div className="view" id="v-edu">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <h2>Education</h2>
        <Button onClick={openAdd}>Add education</Button>
      </div>

      <div className="grid2">
        {educationList.length === 0 ? (
          <div className="glass card empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <b>Nothing here yet</b>
            <p className="hint">Add your degree or university so autofill can use it.</p>
          </div>
        ) : (
          educationList.map((edu) => (
            <Card key={edu.id}>
              <h3 style={{ fontSize: '18px' }}>{edu.institution}</h3>
              <p style={{ color: 'var(--muted)', marginTop: '2px' }}>
                {edu.degree} {edu.branch ? `· ${edu.branch}` : ''}
              </p>
              <div className="row" style={{ margin: '10px 0' }}>
                {edu.cgpa && <Pill variant="a">CGPA {edu.cgpa}</Pill>}
                {(edu.startYear || edu.graduationYear) && (
                  <Pill variant="i">
                    {edu.startYear} – {edu.graduationYear || 'Present'}
                  </Pill>
                )}
              </div>
              <div className="row" style={{ marginTop: '12px' }}>
                <Button variant="soft" size="sm" onClick={() => openEdit(edu)}>
                  Edit
                </Button>
                <Button
                  variant="soft"
                  size="sm"
                  aria-label={`Remove ${edu.institution}`}
                  onClick={() => onDelete(edu.id)}
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
        title={editingItem ? 'Edit education' : 'Add education'}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="stack" style={{ margin: '16px 0' }}>
            <div>
              <label className="f" htmlFor="inst">Institution *</label>
              <input
                className="in"
                id="inst"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="f" htmlFor="deg">Degree</label>
              <input
                className="in"
                id="deg"
                placeholder="e.g. B.Tech, M.S."
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="branch">Branch / Major</label>
              <input
                className="in"
                id="branch"
                placeholder="e.g. Computer Science"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <div className="grid2">
              <div>
                <label className="f" htmlFor="cgpa">CGPA / Percentage</label>
                <input
                  className="in"
                  id="cgpa"
                  placeholder="e.g. 8.6"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                />
              </div>
              <div>
                <label className="f" htmlFor="years">Years</label>
                <div className="vrow">
                  <input
                    className="in"
                    placeholder="2022"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                  />
                  <span>–</span>
                  <input
                    className="in"
                    placeholder="2026"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />
                </div>
              </div>
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
