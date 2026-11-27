import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { SkillItem, SkillCategory } from '../../types/profile';

export interface SkillsViewProps {
  skillsList: SkillItem[];
  onAddSkill: (name: string, category: SkillCategory) => Promise<void>;
  onRemoveSkill: (id: string) => Promise<void>;
}

const CATEGORY_COLORS = ['#DDF0FF', '#EAEBD9', '#D5F5E6', '#FFE9A8', '#FFE3DA'];

// Comprehensive, alphabetically sorted Tech Skills (A-Z)
const TECH_SKILLS = [
  'Agile', 'Android', 'Angular', 'Ansible', 'AWS', 'Azure', 'C', 'C#', 'C++',
  'CI/CD', 'CSS3', 'Django', 'Docker', 'Elasticsearch', 'Express.js', 'FastAPI',
  'Firebase', 'Flutter', 'GCP', 'Git', 'GitHub', 'Go', 'GraphQL', 'HTML5',
  'Java', 'JavaScript', 'Jenkins', 'JIRA', 'Kafka', 'Kotlin', 'Kubernetes',
  'Linux', 'MongoDB', 'MySQL', 'Next.js', 'Node.js', 'NoSQL', 'PHP',
  'PostgreSQL', 'Postman', 'Python', 'PyTorch', 'React', 'React Native',
  'Redis', 'Redux', 'REST APIs', 'Ruby', 'Ruby on Rails', 'Rust', 'Scala',
  'Scikit-learn', 'Spring Boot', 'SQL', 'Supabase', 'Swift', 'Tailwind CSS',
  'TensorFlow', 'TypeScript', 'Vue.js',
].sort((a, b) => a.localeCompare(b));

// Comprehensive, alphabetically sorted Non-Tech & Business Skills (A-Z)
const NON_TECH_SKILLS = [
  'Account Management', 'Budgeting', 'Business Analysis', 'Business Development',
  'Client Communication', 'Content Strategy', 'Content Writing', 'Copywriting',
  'CRM (Salesforce/HubSpot)', 'Customer Success', 'Customer Support', 'Data Analysis',
  'Digital Marketing', 'Email Marketing', 'Event Planning', 'Financial Modeling',
  'Google Analytics', 'Leadership', 'Market Research', 'Microsoft Excel',
  'Negotiation', 'Operations Management', 'Problem Solving', 'Product Management',
  'Project Management', 'Public Relations', 'Public Speaking', 'Quality Assurance (QA)',
  'Recruiting', 'Risk Management', 'Sales', 'SEO', 'Social Media Marketing',
  'Strategic Planning', 'Supply Chain', 'Team Management', 'Technical Writing',
  'Time Management', 'UI/UX Design', 'User Research', 'Vendor Management',
].sort((a, b) => a.localeCompare(b));

export const SkillsView: React.FC<SkillsViewProps> = ({
  skillsList,
  onAddSkill,
  onRemoveSkill,
}) => {
  const [customSkill, setCustomSkill] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tech' | 'non-tech'>('all');

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    await onAddSkill(trimmed, 'other');
    setCustomSkill('');
  };

  const existingNames = useMemo(
    () => new Set(skillsList.map((s) => s.name.toLowerCase())),
    [skillsList]
  );

  const displayedTech = useMemo(() => {
    return TECH_SKILLS.filter(
      (s) =>
        !existingNames.has(s.toLowerCase()) &&
        (!filterQuery || s.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  }, [existingNames, filterQuery]);

  const displayedNonTech = useMemo(() => {
    return NON_TECH_SKILLS.filter(
      (s) =>
        !existingNames.has(s.toLowerCase()) &&
        (!filterQuery || s.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  }, [existingNames, filterQuery]);

  return (
    <div className="view" id="v-skills">
      <Card>
        <h2 style={{ marginBottom: '6px' }}>Skills & proficiencies</h2>
        <p className="hint" style={{ marginBottom: '16px' }}>
          Autofills technical questions, job tags, and skills inputs across portals.
        </p>

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

        {/* Add custom skill input (No category required) */}
        <form onSubmit={handleAddCustom} className="row" style={{ marginBottom: '20px' }}>
          <input
            className="in"
            style={{ maxWidth: '320px' }}
            placeholder="Type any skill and hit Enter..."
            aria-label="New skill name"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
          />
          <button type="submit" className="btn sm">
            + Add Skill
          </button>
        </form>

        {/* Filter & View Tabs for Predefined Skills */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px' }}>
          <div className="row sp" style={{ marginBottom: '12px' }}>
            <div className="seg glass" role="group" aria-label="Skill types">
              <button
                type="button"
                aria-pressed={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
              >
                All Skills
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'tech'}
                onClick={() => setActiveTab('tech')}
              >
                Tech Jobs
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'non-tech'}
                onClick={() => setActiveTab('non-tech')}
              >
                Non-Tech & Business
              </button>
            </div>

            <input
              className="in"
              style={{ maxWidth: '240px', minHeight: '38px', fontSize: '13px' }}
              placeholder="Filter predefined skills..."
              aria-label="Filter predefined skills"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          {/* Tech Skills Section (Alphabetical A-Z) */}
          {(activeTab === 'all' || activeTab === 'tech') && displayedTech.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '13.5px', margin: '0 0 8px', color: 'var(--muted)' }}>
                Tech & Engineering Skills ({displayedTech.length})
              </h3>
              <div className="row" style={{ gap: '6px' }}>
                {displayedTech.map((sug) => (
                  <Chip
                    key={sug}
                    onClick={() => onAddSkill(sug, 'other')}
                  >
                    + {sug}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* Non-Tech & Business Skills Section (Alphabetical A-Z) */}
          {(activeTab === 'all' || activeTab === 'non-tech') && displayedNonTech.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13.5px', margin: '0 0 8px', color: 'var(--muted)' }}>
                Non-Tech, Product & Operations Skills ({displayedNonTech.length})
              </h3>
              <div className="row" style={{ gap: '6px' }}>
                {displayedNonTech.map((sug) => (
                  <Chip
                    key={sug}
                    onClick={() => onAddSkill(sug, 'other')}
                  >
                    + {sug}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
