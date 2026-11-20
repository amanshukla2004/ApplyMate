import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { SkillItem, SkillCategory } from '../../types/profile';

export interface SkillsViewProps {
  skillsList: SkillItem[];
  onAddSkill: (name: string, category: SkillCategory) => Promise<void>;
  onRemoveSkill: (id: string) => Promise<void>;
}

const CATEGORY_COLORS = ['#DDF0FF', '#E9E2FF', '#D5F5E6', '#FFE9A8', '#FFE3DA'];

const POPULAR_SUGGESTIONS: Record<string, string[]> = {
  'Languages': ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'SQL', 'C++'],
  'Frameworks & Libraries': ['React', 'Next.js', 'Node.js', 'Express.js', 'Tailwind CSS', 'Spring Boot'],
  'Databases & Storage': ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Supabase'],
  'DevOps & Cloud': ['Docker', 'AWS', 'Kubernetes', 'CI/CD', 'Git', 'Linux'],
  'AI & Tooling': ['Gemini API', 'OpenAI', 'Prompt Engineering', 'LangChain', 'Postman'],
};

export const SkillsView: React.FC<SkillsViewProps> = ({
  skillsList,
  onAddSkill,
  onRemoveSkill,
}) => {
  const [customSkill, setCustomSkill] = useState('');
  const [selectedCat, setSelectedCat] = useState<SkillCategory>('languages');

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSkill.trim()) return;
    await onAddSkill(customSkill.trim(), selectedCat);
    setCustomSkill('');
  };

  const existingNames = skillsList.map((s) => s.name.toLowerCase());

  return (
    <div className="view" id="v-skills">
      <Card>
        <h2 style={{ marginBottom: '14px' }}>Technical skills</h2>

        {/* Existing skill tags */}
        <div className="row" id="tags" style={{ minHeight: '44px', marginBottom: '20px' }}>
          {skillsList.length === 0 ? (
            <p className="hint">No skills saved yet. Pick from the suggestions below or add your own.</p>
          ) : (
            skillsList.map((skill, index) => {
              const bg = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              return (
                <span
                  key={skill.id}
                  className="tag"
                  style={{ background: bg, color: '#2B2340' }}
                >
                  {skill.name}
                  <button
                    type="button"
                    aria-label={`Remove ${skill.name}`}
                    onClick={() => onRemoveSkill(skill.id)}
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Add custom skill input */}
        <form onSubmit={handleAddCustom} className="row" style={{ marginBottom: '24px' }}>
          <input
            className="in"
            style={{ maxWidth: '260px' }}
            placeholder="Add custom skill..."
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
          />
          <select
            className="in"
            style={{ width: '150px' }}
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value as SkillCategory)}
          >
            <option value="languages">Languages</option>
            <option value="frameworks">Frameworks</option>
            <option value="databases">Databases</option>
            <option value="cloud">Cloud / DevOps</option>
            <option value="developerTools">Dev Tools</option>
            <option value="ai">AI</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="btn sm">
            + Add
          </button>
        </form>

        {/* Popular suggestion chips across categories */}
        {Object.entries(POPULAR_SUGGESTIONS).map(([categoryTitle, items]) => {
          const available = items.filter((item) => !existingNames.includes(item.toLowerCase()));
          if (available.length === 0) return null;

          return (
            <div key={categoryTitle} style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 8px', color: 'var(--muted)' }}>
                {categoryTitle}
              </h3>
              <div className="row">
                {available.map((sug) => (
                  <Chip
                    key={sug}
                    onClick={() => onAddSkill(sug, 'frameworks')}
                  >
                    + {sug}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
