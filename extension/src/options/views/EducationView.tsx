import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Modal } from '../../components/ui/Modal';
import { EducationRecord } from '../../types/profile';
import { Check, Save, RotateCcw, Trash2, Plus } from 'lucide-react';

export interface EducationViewProps {
  educationList: EducationRecord[];
  onSave: (record: EducationRecord) => Promise<void>;
  onSaveAll?: (records: EducationRecord[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface TierState {
  id: string;
  institution: string;
  board: string;
  startYear: string;
  graduationYear: string;
  percentage: string;
  degree: string;
  branch: string;
  rollNo: string;
}

const DEFAULT_NA = 'N/A';

export const EducationView: React.FC<EducationViewProps> = ({
  educationList,
  onSave,
  onSaveAll,
  onDelete,
}) => {
  // Helper to extract or initialize tier with N/A defaults
  const getTierData = (level: '10th' | '12th' | 'ug' | 'pg', defaultDeg: string): TierState => {
    const existing = educationList.find((e) => {
      if (e.level === level) return true;
      if (e.id === `edu-${level}` || e.id === `edu_${level}`) return true;
      const deg = (e.degree || '').toLowerCase();
      const inst = (e.institution || '').toLowerCase();
      if (level === '10th') {
        return deg.includes('10th') || deg.includes('secondary') || inst.includes('10th') || inst.includes('matric');
      }
      if (level === '12th') {
        return deg.includes('12th') || deg.includes('intermediate') || deg.includes('higher secondary') || deg.includes('+2') || inst.includes('12th') || inst.includes('inter');
      }
      if (level === 'pg') {
        return deg.includes('master') || deg.includes('m.tech') || deg.includes('mca') || deg.includes('mba') || deg.includes('m.s') || deg.includes('post');
      }
      if (level === 'ug') {
        return deg.includes('bachelor') || deg.includes('b.tech') || deg.includes('b.e') || deg.includes('bca') || deg.includes('b.sc') || deg.includes('under') || (!deg.includes('10th') && !deg.includes('12th') && !deg.includes('master'));
      }
      return false;
    });

    if (existing) {
      return {
        id: existing.id || `edu-${level}`,
        institution: existing.institution || DEFAULT_NA,
        board: existing.board || DEFAULT_NA,
        startYear: existing.startYear || DEFAULT_NA,
        graduationYear: existing.graduationYear || DEFAULT_NA,
        percentage: existing.percentage || existing.cgpa || DEFAULT_NA,
        degree: existing.degree || defaultDeg,
        branch: existing.branch || (level === '10th' || level === '12th' ? 'General' : DEFAULT_NA),
        rollNo: existing.rollNo || DEFAULT_NA,
      };
    }

    return {
      id: `edu-${level}`,
      institution: DEFAULT_NA,
      board: DEFAULT_NA,
      startYear: DEFAULT_NA,
      graduationYear: DEFAULT_NA,
      percentage: DEFAULT_NA,
      degree: defaultDeg,
      branch: level === '10th' || level === '12th' ? 'General' : DEFAULT_NA,
      rollNo: DEFAULT_NA,
    };
  };

  // 4 Structured Tiers
  const [tenth, setTenth] = useState<TierState>(() => getTierData('10th', 'Class 10th (Secondary)'));
  const [twelfth, setTwelfth] = useState<TierState>(() => getTierData('12th', 'Class 12th (Higher Secondary)'));
  const [ug, setUg] = useState<TierState>(() => getTierData('ug', 'Undergraduate (UG)'));
  const [pg, setPg] = useState<TierState>(() => getTierData('pg', 'Postgraduate (PG)'));

  // Sync state when educationList updates from outside
  useEffect(() => {
    setTenth(getTierData('10th', 'Class 10th (Secondary)'));
    setTwelfth(getTierData('12th', 'Class 12th (Higher Secondary)'));
    setUg(getTierData('ug', 'Undergraduate (UG)'));
    setPg(getTierData('pg', 'Postgraduate (PG)'));
  }, [educationList]);

  // Saving states & toast indicators
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savedSuccessKey, setSavedSuccessKey] = useState<string | null>(null);

  // Other custom qualifications (if user had other degrees)
  const otherList = educationList.filter((e) => {
    const id = e.id || '';
    const level = e.level || '';
    return (
      id !== tenth.id &&
      id !== twelfth.id &&
      id !== ug.id &&
      id !== pg.id &&
      level !== '10th' &&
      level !== '12th' &&
      level !== 'ug' &&
      level !== 'pg'
    );
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOther, setEditingOther] = useState<EducationRecord | null>(null);
  const [otherLevel, setOtherLevel] = useState('Diploma');
  const [otherInst, setOtherInst] = useState('');
  const [otherDegree, setOtherDegree] = useState('');
  const [otherBranch, setOtherBranch] = useState('');
  const [otherBoard, setOtherBoard] = useState('');
  const [otherCgpa, setOtherCgpa] = useState('');
  const [otherStartYear, setOtherStartYear] = useState('');
  const [otherEndYear, setOtherEndYear] = useState('');
  const [otherRollNo, setOtherRollNo] = useState('');

  // Handle tier value updates
  const updateField = (
    tierSetter: React.Dispatch<React.SetStateAction<TierState>>,
    field: keyof TierState,
    value: string
  ) => {
    tierSetter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Convert state to record
  const tierToRecord = (state: TierState, level: '10th' | '12th' | 'ug' | 'pg'): EducationRecord => {
    const clean = (val: string) => (val.trim() === '' ? DEFAULT_NA : val.trim());
    return {
      id: state.id,
      level,
      institution: clean(state.institution),
      board: clean(state.board),
      startYear: clean(state.startYear),
      graduationYear: clean(state.graduationYear),
      percentage: clean(state.percentage),
      cgpa: clean(state.percentage),
      degree: clean(state.degree),
      branch: clean(state.branch),
      rollNo: clean(state.rollNo),
    };
  };

  // Save single tier
  const handleSaveTier = async (level: '10th' | '12th' | 'ug' | 'pg') => {
    let rec: EducationRecord;
    if (level === '10th') rec = tierToRecord(tenth, '10th');
    else if (level === '12th') rec = tierToRecord(twelfth, '12th');
    else if (level === 'ug') rec = tierToRecord(ug, 'ug');
    else rec = tierToRecord(pg, 'pg');

    await onSave(rec);
    setSavedSuccessKey(level);
    setTimeout(() => setSavedSuccessKey(null), 2000);
  };

  // Reset a tier to N/A
  const handleResetTier = (level: '10th' | '12th' | 'ug' | 'pg', defaultDeg: string) => {
    const resetData: TierState = {
      id: `edu-${level}`,
      institution: DEFAULT_NA,
      board: DEFAULT_NA,
      startYear: DEFAULT_NA,
      graduationYear: DEFAULT_NA,
      percentage: DEFAULT_NA,
      degree: defaultDeg,
      branch: level === '10th' || level === '12th' ? 'General' : DEFAULT_NA,
      rollNo: DEFAULT_NA,
    };
    if (level === '10th') setTenth(resetData);
    else if (level === '12th') setTwelfth(resetData);
    else if (level === 'ug') setUg(resetData);
    else setPg(resetData);
  };

  // Save All 4 Tiers
  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      const allRecords = [
        tierToRecord(tenth, '10th'),
        tierToRecord(twelfth, '12th'),
        tierToRecord(ug, 'ug'),
        tierToRecord(pg, 'pg'),
      ];

      if (onSaveAll) {
        await onSaveAll(allRecords);
      } else {
        for (const rec of allRecords) {
          await onSave(rec);
        }
      }
      setSavedSuccessKey('all');
      setTimeout(() => setSavedSuccessKey(null), 2500);
    } finally {
      setIsSavingAll(false);
    }
  };

  // Modal for other qualifications
  const openAddOther = (presetDegree?: string) => {
    setEditingOther(null);
    setOtherLevel(presetDegree ? 'Diploma' : 'other');
    setOtherInst('');
    setOtherDegree(presetDegree || '');
    setOtherBranch('');
    setOtherBoard('');
    setOtherCgpa('');
    setOtherStartYear('');
    setOtherEndYear('');
    setOtherRollNo('');
    setModalOpen(true);
  };

  const openEditOther = (edu: EducationRecord) => {
    setEditingOther(edu);
    setOtherLevel(edu.level || 'other');
    setOtherInst(edu.institution !== DEFAULT_NA ? edu.institution : '');
    setOtherDegree(edu.degree !== DEFAULT_NA ? edu.degree : '');
    setOtherBranch(edu.branch && edu.branch !== DEFAULT_NA ? edu.branch : '');
    setOtherBoard(edu.board && edu.board !== DEFAULT_NA ? edu.board : '');
    setOtherCgpa(
      edu.percentage && edu.percentage !== DEFAULT_NA
        ? edu.percentage
        : edu.cgpa && edu.cgpa !== DEFAULT_NA
        ? edu.cgpa
        : ''
    );
    setOtherStartYear(edu.startYear && edu.startYear !== DEFAULT_NA ? edu.startYear : '');
    setOtherEndYear(edu.graduationYear && edu.graduationYear !== DEFAULT_NA ? edu.graduationYear : '');
    setOtherRollNo(edu.rollNo && edu.rollNo !== DEFAULT_NA ? edu.rollNo : '');
    setModalOpen(true);
  };

  const handleSaveOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherInst.trim()) return;
    const clean = (val: string) => (val.trim() === '' ? DEFAULT_NA : val.trim());
    const rec: EducationRecord = {
      id: editingOther?.id || `edu-other-${Date.now()}`,
      level: otherLevel || 'other',
      institution: clean(otherInst),
      degree: clean(otherDegree),
      branch: clean(otherBranch),
      board: clean(otherBoard),
      cgpa: clean(otherCgpa),
      percentage: clean(otherCgpa),
      startYear: clean(otherStartYear),
      graduationYear: clean(otherEndYear),
      rollNo: clean(otherRollNo),
    };
    await onSave(rec);
    setModalOpen(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div className="view" id="v-edu" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Education
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13.5px' }}>
            Academic qualifications for job portals and campus hiring. Defaults to N/A.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            variant="soft"
            type="button"
            onClick={() => openAddOther()}
            style={{
              fontWeight: 600,
              padding: '9px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            <span>+ Add Other Education</span>
          </Button>

          <Button
            onClick={handleSaveAll}
            disabled={isSavingAll}
            style={{
              background: 'var(--theme)',
              color: 'var(--btn-t)',
              fontWeight: 700,
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {savedSuccessKey === 'all' ? (
              <>
                <Check size={15} color="#10B981" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{isSavingAll ? 'Saving All...' : 'Save All Education'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid of 4 Structured Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* ============================================================== */}
        {/* CARD 1: CLASS 10TH */}
        {/* ============================================================== */}
        <Card
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🏫</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                  Class 10th
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Secondary School</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleResetTier('10th', 'Class 10th (Secondary)')}
                title="Reset fields to N/A"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RotateCcw size={11} />
                <span>Reset N/A</span>
              </button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => handleSaveTier('10th')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {savedSuccessKey === '10th' ? <Check size={12} color="#10B981" /> : <Save size={12} />}
                <span>{savedSuccessKey === '10th' ? 'Saved' : 'Save'}</span>
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Board</label>
              <input
                style={inputStyle}
                placeholder="e.g. CBSE, ICSE, State Board, or N/A"
                value={tenth.board}
                onChange={(e) => updateField(setTenth, 'board', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>School / Institution Name</label>
              <input
                style={inputStyle}
                placeholder="e.g. St. Xavier's High School, or N/A"
                value={tenth.institution}
                onChange={(e) => updateField(setTenth, 'institution', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Start Year</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2017 or N/A"
                  value={tenth.startYear}
                  onChange={(e) => updateField(setTenth, 'startYear', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>End Year (Passing)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2018 or N/A"
                  value={tenth.graduationYear}
                  onChange={(e) => updateField(setTenth, 'graduationYear', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Percentage / CGPA</label>
              <input
                style={inputStyle}
                placeholder="e.g. 91.4% or 9.4 or N/A"
                value={tenth.percentage}
                onChange={(e) => updateField(setTenth, 'percentage', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ============================================================== */}
        {/* CARD 2: CLASS 12TH */}
        {/* ============================================================== */}
        <Card
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🏫</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                  Class 12th
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Higher Secondary / Intermediate
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleResetTier('12th', 'Class 12th (Higher Secondary)')}
                title="Reset fields to N/A"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RotateCcw size={11} />
                <span>Reset N/A</span>
              </button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => handleSaveTier('12th')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {savedSuccessKey === '12th' ? <Check size={12} color="#10B981" /> : <Save size={12} />}
                <span>{savedSuccessKey === '12th' ? 'Saved' : 'Save'}</span>
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Board</label>
              <input
                style={inputStyle}
                placeholder="e.g. CBSE, ISC, State Board, or N/A"
                value={twelfth.board}
                onChange={(e) => updateField(setTwelfth, 'board', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>School / College Name</label>
              <input
                style={inputStyle}
                placeholder="e.g. DPS R.K. Puram, Junior College, or N/A"
                value={twelfth.institution}
                onChange={(e) => updateField(setTwelfth, 'institution', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Start Year</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2018 or N/A"
                  value={twelfth.startYear}
                  onChange={(e) => updateField(setTwelfth, 'startYear', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>End Year (Passing)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2020 or N/A"
                  value={twelfth.graduationYear}
                  onChange={(e) => updateField(setTwelfth, 'graduationYear', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Percentage / CGPA</label>
              <input
                style={inputStyle}
                placeholder="e.g. 88.6% or 9.0 or N/A"
                value={twelfth.percentage}
                onChange={(e) => updateField(setTwelfth, 'percentage', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ============================================================== */}
        {/* CARD 3: UG COLLEGE */}
        {/* ============================================================== */}
        <Card
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                  UG College
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Undergraduate (B.Tech, B.E., B.Sc, BCA, etc.)
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleResetTier('ug', 'Undergraduate (UG)')}
                title="Reset fields to N/A"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RotateCcw size={11} />
                <span>Reset N/A</span>
              </button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => handleSaveTier('ug')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {savedSuccessKey === 'ug' ? <Check size={12} color="#10B981" /> : <Save size={12} />}
                <span>{savedSuccessKey === 'ug' ? 'Saved' : 'Save'}</span>
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>UG College / University</label>
              <input
                style={inputStyle}
                placeholder="e.g. National Institute of Technology, or N/A"
                value={ug.institution}
                onChange={(e) => updateField(setUg, 'institution', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Degree & Branch</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. B.Tech Computer Science, or N/A"
                  value={ug.degree}
                  onChange={(e) => updateField(setUg, 'degree', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Roll No. / Reg No.</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 20BCS042 or N/A"
                  value={ug.rollNo}
                  onChange={(e) => updateField(setUg, 'rollNo', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Start Year</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2020 or N/A"
                  value={ug.startYear}
                  onChange={(e) => updateField(setUg, 'startYear', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>End Year (Graduation)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2024 or N/A"
                  value={ug.graduationYear}
                  onChange={(e) => updateField(setUg, 'graduationYear', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Percentage / CGPA</label>
              <input
                style={inputStyle}
                placeholder="e.g. 8.65 CGPA or 82.5% or N/A"
                value={ug.percentage}
                onChange={(e) => updateField(setUg, 'percentage', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ============================================================== */}
        {/* CARD 4: PG COLLEGE */}
        {/* ============================================================== */}
        <Card
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                  PG College
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Postgraduate (M.Tech, MCA, MBA, M.S., etc.)
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleResetTier('pg', 'Postgraduate (PG)')}
                title="Reset fields to N/A"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RotateCcw size={11} />
                <span>Reset N/A</span>
              </button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => handleSaveTier('pg')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {savedSuccessKey === 'pg' ? <Check size={12} color="#10B981" /> : <Save size={12} />}
                <span>{savedSuccessKey === 'pg' ? 'Saved' : 'Save'}</span>
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>PG College / University</label>
              <input
                style={inputStyle}
                placeholder="e.g. IIT Delhi, BITS Pilani, or N/A"
                value={pg.institution}
                onChange={(e) => updateField(setPg, 'institution', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Degree & Branch</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. M.Tech AI & Data Science, or N/A"
                  value={pg.degree}
                  onChange={(e) => updateField(setPg, 'degree', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Roll No. / Reg No.</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 24MCS010 or N/A"
                  value={pg.rollNo}
                  onChange={(e) => updateField(setPg, 'rollNo', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Start Year</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2024 or N/A"
                  value={pg.startYear}
                  onChange={(e) => updateField(setPg, 'startYear', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>End Year (Graduation)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2026 or N/A"
                  value={pg.graduationYear}
                  onChange={(e) => updateField(setPg, 'graduationYear', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Percentage / CGPA</label>
              <input
                style={inputStyle}
                placeholder="e.g. 8.9 CGPA or 85% or N/A"
                value={pg.percentage}
                onChange={(e) => updateField(setPg, 'percentage', e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Always Visible: Other Educations & Qualifications Section */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Other Educations & Qualifications {otherList.length > 0 ? `(${otherList.length})` : ''}
            </h3>
            <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '12.5px' }}>
              Add diplomas, PhD / doctorate, certifications, second degrees, associate degrees, or polytechnic.
            </p>
          </div>
          <Button
            variant="soft"
            size="sm"
            onClick={() => openAddOther()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Plus size={14} /> + Add Other Education
          </Button>
        </div>

        {otherList.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: 'rgba(76, 69, 65, 0.03)',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '28px' }}>🎓</div>
            <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>
              No other qualifications added yet
            </p>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)', maxWidth: '420px' }}>
              Have a Diploma, PhD, Associate Degree, Polytechnic, or additional course? Add them here so they autofill when requested.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              {['Diploma in Engineering', 'PhD / Doctorate', 'Associate Degree', 'Post-Graduate Diploma', 'Polytechnic'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => openAddOther(preset)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '99px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={11} style={{ color: 'var(--theme)' }} /> + {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {otherList.map((edu) => (
              <Card key={edu.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: 'var(--text)' }}>
                      {edu.institution}
                    </h4>
                    {edu.level && edu.level !== 'other' && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          background: 'rgba(76, 69, 65, 0.08)',
                          color: 'var(--text)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {edu.level}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--muted)', margin: '0 0 10px', fontSize: '13.5px' }}>
                    {edu.degree} {edu.branch && edu.branch !== 'N/A' ? `· ${edu.branch}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {edu.board && edu.board !== 'N/A' && (
                      <Pill variant="i">Board: {edu.board}</Pill>
                    )}
                    {edu.percentage && edu.percentage !== 'N/A' && (
                      <Pill variant="a">Score: {edu.percentage}</Pill>
                    )}
                    {(edu.startYear || edu.graduationYear) && (
                      <Pill variant="i">
                        {edu.startYear || 'N/A'} – {edu.graduationYear || 'Present'}
                      </Pill>
                    )}
                    {edu.rollNo && edu.rollNo !== 'N/A' && (
                      <Pill variant="i">Roll: {edu.rollNo}</Pill>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <Button variant="soft" size="sm" onClick={() => openEditOther(edu)}>
                    Edit
                  </Button>
                  <Button variant="soft" size="sm" onClick={() => onDelete(edu.id)} style={{ color: 'var(--error)' }}>
                    <Trash2 size={13} style={{ marginRight: '4px' }} />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal for additional qualification */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingOther ? 'Edit Education / Qualification' : 'Add Other Education'}
        >
          <form onSubmit={handleSaveOther}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '14px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Education Level / Type</label>
                  <select
                    style={inputStyle}
                    value={otherLevel}
                    onChange={(e) => setOtherLevel(e.target.value)}
                  >
                    <option value="Diploma">Diploma / Polytechnic</option>
                    <option value="PhD">PhD / Doctorate</option>
                    <option value="Associate">Associate Degree</option>
                    <option value="PostGraduate">Post-Graduate Diploma</option>
                    <option value="Certification">Certification / Bootcamp</option>
                    <option value="other">Other Qualification</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Institution / College / School *</label>
                  <input
                    style={inputStyle}
                    required
                    value={otherInst}
                    onChange={(e) => setOtherInst(e.target.value)}
                    placeholder="e.g. State Polytechnic Institute"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Degree / Course Name</label>
                  <input
                    style={inputStyle}
                    value={otherDegree}
                    onChange={(e) => setOtherDegree(e.target.value)}
                    placeholder="e.g. Diploma in Civil Engineering"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Field of Study / Branch</label>
                  <input
                    style={inputStyle}
                    value={otherBranch}
                    onChange={(e) => setOtherBranch(e.target.value)}
                    placeholder="e.g. Civil Engineering or N/A"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Board / University / Authority</label>
                <input
                  style={inputStyle}
                  value={otherBoard}
                  onChange={(e) => setOtherBoard(e.target.value)}
                  placeholder="e.g. State Board of Technical Education or N/A"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Start Year</label>
                  <input
                    style={inputStyle}
                    value={otherStartYear}
                    onChange={(e) => setOtherStartYear(e.target.value)}
                    placeholder="e.g. 2019 or N/A"
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Year (Graduation)</label>
                  <input
                    style={inputStyle}
                    value={otherEndYear}
                    onChange={(e) => setOtherEndYear(e.target.value)}
                    placeholder="e.g. 2022 or N/A"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Percentage / CGPA</label>
                  <input
                    style={inputStyle}
                    value={otherCgpa}
                    onChange={(e) => setOtherCgpa(e.target.value)}
                    placeholder="e.g. 82% or 8.5 or N/A"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Roll No. / Registration No. (Optional)</label>
                <input
                  style={inputStyle}
                  value={otherRollNo}
                  onChange={(e) => setOtherRollNo(e.target.value)}
                  placeholder="e.g. 21DPL049 or N/A"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="soft" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Qualification</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
