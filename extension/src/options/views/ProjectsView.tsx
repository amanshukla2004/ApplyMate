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

/**
 * Extracts and cleans individual bullet points from multi-line or wrapped project descriptions.
 */
export function extractBulletPoints(text: string): string[] {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const hasBulletMarkers = rawLines.some((l) => /^[•\-\*–—\u2022\u2023\u25E6\u2043\u2219]|\b\d+\.\s/.test(l));
  const bullets: string[] = [];

  if (hasBulletMarkers) {
    for (const line of rawLines) {
      const isNewBullet = /^[•\-\*–—\u2022\u2023\u25E6\u2043\u2219]|\b\d+\.\s/.test(line);
      const cleanContent = line.replace(/^[•\-\*–—\u2022\u2023\u25E6\u2043\u2219\d.]+\s*/, '').trim();

      if (isNewBullet) {
        if (cleanContent) bullets.push(cleanContent);
      } else if (bullets.length > 0) {
        bullets[bullets.length - 1] += ' ' + line;
      } else {
        bullets.push(line);
      }
    }
  } else {
    for (const line of rawLines) {
      if (bullets.length === 0) {
        bullets.push(line);
      } else {
        const prev = bullets[bullets.length - 1];
        const isContinuation = !/[.!?]$/.test(prev) || /^[a-z]/.test(line);
        if (isContinuation) {
          bullets[bullets.length - 1] += ' ' + line;
        } else {
          bullets.push(line);
        }
      }
    }
  }

  return bullets.filter(Boolean);
}

/**
 * Gets the most comprehensive description available for a project.
 */
export function getProjectDescription(proj: ProjectRecord): string {
  const detailed = proj.detailedDescription?.trim() || '';
  const short = proj.shortDescription?.trim() || '';
  if (detailed && detailed.length >= short.length) {
    return detailed;
  }
  return short || detailed;
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
    setShortDescription(getProjectDescription(proj));
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

    const descTrimmed = shortDescription.trim();
    const bulletsList = extractBulletPoints(descTrimmed);
    const firstBullet = bulletsList[0] || descTrimmed;

    const record: ProjectRecord = {
      id: editingItem?.id || `proj-${Date.now()}`,
      name: name.trim(),
      liveUrl: liveUrl.trim(),
      githubUrl: githubUrl.trim(),
      technologies: techArray,
      shortDescription: firstBullet,
      detailedDescription: descTrimmed,
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
          projectList.map((proj) => {
            const fullDesc = getProjectDescription(proj);
            const bullets = extractBulletPoints(fullDesc);

            return (
              <Card key={proj.id}>
                <h3 style={{ fontSize: '18px' }}>{proj.name}</h3>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '4px 0 6px 0' }}>
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      🔗 {proj.liveUrl}
                    </a>
                  )}
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      📂 GitHub
                    </a>
                  )}
                </div>

                <div className="row" style={{ margin: '8px 0' }}>
                  {(proj.technologies || []).map((t) => (
                    <Pill key={t} variant="a">
                      {t}
                    </Pill>
                  ))}
                </div>

                {bullets.length > 1 ? (
                  <ul style={{ margin: '8px 0 12px 0', paddingLeft: '18px', fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.55 }}>
                    {bullets.map((b, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : bullets.length === 1 ? (
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '8px 0 12px 0', lineHeight: 1.5 }}>
                    {bullets[0]}
                  </p>
                ) : null}

                <div className="row" style={{ marginTop: 'auto', paddingTop: '8px' }}>
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
            );
          })
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
              <label className="f" htmlFor="pr-d">Description & bullet points</label>
              <textarea
                className="in"
                id="pr-d"
                rows={5}
                placeholder="Enter bullet points (one per line) or project description..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
              <span className="hint" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Tip: Add multiple bullet points separated by newlines or •
              </span>
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
