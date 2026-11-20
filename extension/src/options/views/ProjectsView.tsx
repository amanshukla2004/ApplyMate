import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { ProjectRecord } from '../../types/profile';

export interface ProjectsViewProps {
  projectList: ProjectRecord[];
  onSave: (record: ProjectRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projectList,
  onSave,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectRecord | null>(null);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [techStack, setTechStack] = useState('');
  const [shortDescription, setShortDescription] = useState('');

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setLiveUrl('');
    setGithubUrl('');
    setTechStack('');
    setShortDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (proj: ProjectRecord) => {
    setEditingItem(proj);
    setName(proj.name);
    setLiveUrl(proj.liveUrl || '');
    setGithubUrl(proj.githubUrl || '');
    setTechStack((proj.technologies || []).join(', '));
    setShortDescription(proj.shortDescription || proj.detailedDescription || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }

    const techArray = techStack
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const record: ProjectRecord = {
      id: editingItem?.id || `proj-${Date.now()}`,
      name: name.trim(),
      liveUrl: liveUrl.trim(),
      githubUrl: githubUrl.trim(),
      technologies: techArray,
      shortDescription: shortDescription.trim(),
      detailedDescription: shortDescription.trim(),
    };

    await onSave(record);
    setModalOpen(false);
  };

  return (
    <div className="view" id="v-proj">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <h2>Projects</h2>
        <Button onClick={openAdd}>Add project</Button>
      </div>

      <div className="grid2">
        {projectList.length === 0 ? (
          <div className="glass card empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <b>Nothing here yet</b>
            <p className="hint">Add your key portfolio projects for autofill & AI drafting.</p>
          </div>
        ) : (
          projectList.map((proj) => (
            <Card key={proj.id}>
              <h3 style={{ fontSize: '18px' }}>{proj.name}</h3>
              {proj.liveUrl && (
                <a
                  href={proj.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}
                >
                  {proj.liveUrl}
                </a>
              )}
              <div className="row" style={{ margin: '10px 0' }}>
                {(proj.technologies || []).map((t) => (
                  <Pill key={t} variant="a">
                    {t}
                  </Pill>
                ))}
              </div>
              {(proj.shortDescription || proj.detailedDescription) && (
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '8px 0' }}>
                  {proj.shortDescription || proj.detailedDescription}
                </p>
              )}
              <div className="row" style={{ marginTop: '12px' }}>
                <Button variant="soft" size="sm" onClick={() => openEdit(proj)}>
                  Edit
                </Button>
                <Button
                  variant="soft"
                  size="sm"
                  aria-label={`Remove ${proj.name}`}
                  onClick={() => onDelete(proj.id)}
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
        title={editingItem ? 'Edit project' : 'Add project'}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="stack" style={{ margin: '16px 0' }}>
            <div>
              <label className="f" htmlFor="pr-n">Project name *</label>
              <input
                className="in"
                id="pr-n"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="f" htmlFor="pr-l">Live URL</label>
              <input
                className="in"
                id="pr-l"
                placeholder="https://myproject.com"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="pr-g">GitHub repository URL</label>
              <input
                className="in"
                id="pr-g"
                placeholder="https://github.com/user/project"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="pr-t">Tech stack (comma separated)</label>
              <input
                className="in"
                id="pr-t"
                placeholder="React, TypeScript, IndexedDB"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="pr-d">Description</label>
              <textarea
                className="in"
                id="pr-d"
                rows={3}
                placeholder="Short description of what the project does..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
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
