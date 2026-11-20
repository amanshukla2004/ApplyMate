import React from 'react';
import { Card } from '../../components/ui/Card';
import { Ring } from '../../components/ui/Ring';
import { Pill } from '../../components/ui/Pill';
import { UserProfile, ApplicationRecord } from '../../types/profile';

export interface OverviewViewProps {
  profile: UserProfile | null;
  applications: ApplicationRecord[];
  readiness: number;
  hasResume: boolean;
  hasSkills: boolean;
  onNavigate: (section: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  applications,
  readiness,
  hasResume,
  hasSkills,
  onNavigate,
}) => {
  // Real application status counts matching ApplicationStatus
  const savedCount = applications.filter((a) => a.status === 'Saved').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;

  const hasPersonal = Boolean(profile?.personal?.firstName && profile?.personal?.email);

  return (
    <div className="view" id="v-overview">
      <Card className="hero">
        <Ring percentage={readiness} size={124} />
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ fontSize: '26px', marginBottom: '6px' }}>
            Your profile is {readiness}% ready
          </h2>
          <p style={{ color: 'var(--muted)' }}>
            Three steps left before autofill can answer most forms without you.
          </p>
        </div>
        <div className="steps">
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('skills')}
          >
            <Pill variant={hasSkills ? 'm' : 'r'}>
              {hasSkills ? 'Done' : 'To do'}
            </Pill>
            {hasSkills ? 'Skills added' : 'Add 5 more skills'}
          </button>
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('vault')}
          >
            <Pill variant={hasResume ? 'm' : 'r'}>
              {hasResume ? 'Done' : 'To do'}
            </Pill>
            {hasResume ? 'Resume uploaded' : 'Upload a resume'}
          </button>
          <button
            type="button"
            className="step glass"
            onClick={() => onNavigate('personal')}
          >
            <Pill variant={hasPersonal ? 'm' : 'r'}>
              {hasPersonal ? 'Done' : 'To do'}
            </Pill>
            Personal details
          </button>
        </div>
      </Card>

      <div className="stats">
        <div className="stat" style={{ background: '#DDF0FF' }}>
          Saved<b>{savedCount}</b>
        </div>
        <div className="stat" style={{ background: '#E9E2FF' }}>
          Applied<b>{appliedCount}</b>
        </div>
        <div className="stat" style={{ background: '#FFE9A8' }}>
          Total Tracked<b>{applications.length}</b>
        </div>
        <div className="stat" style={{ background: '#D5F5E6' }}>
          Profile Ready<b>{readiness}%</b>
        </div>
      </div>
    </div>
  );
};
