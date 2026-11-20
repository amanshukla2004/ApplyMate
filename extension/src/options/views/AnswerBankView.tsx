import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Pill';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { SavedAnswer, AnswerCategory } from '../../types/profile';

export interface AnswerBankViewProps {
  answerList: SavedAnswer[];
  onSave: (record: SavedAnswer) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORIES = ['All', 'Behavioral', 'Technical', 'Projects', 'Salary', 'Availability'] as const;

const PILL_VARIANTS: Record<string, 'a' | 'i' | 'm' | 'r' | 'u'> = {
  Behavioral: 'a',
  Technical: 'i',
  Projects: 'm',
  Salary: 'r',
  Availability: 'u',
};

export const AnswerBankView: React.FC<AnswerBankViewProps> = ({
  answerList,
  onSave,
  onDelete,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<SavedAnswer | null>(null);
  const [category, setCategory] = useState<AnswerCategory>('Behavioral');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const filteredAnswers = answerList.filter((a) => {
    const matchesCat =
      selectedCat === 'All' ||
      a.category.toLowerCase() === selectedCat.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAdd = () => {
    setEditingAnswer(null);
    setCategory('Behavioral');
    setQuestion('');
    setAnswer('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    const record: SavedAnswer = {
      id: editingAnswer?.id || `ans-${Date.now()}`,
      category,
      question: question.trim(),
      answer: answer.trim(),
      tags: [],
      createdAt: editingAnswer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSave(record);
    setModalOpen(false);
  };

  return (
    <div className="view" id="v-answers">
      <div className="row sp" style={{ marginBottom: '14px' }}>
        <h2>Answer bank</h2>
        <Button onClick={openAdd}>Add answer</Button>
      </div>

      <label className="f" htmlFor="as">Search answers</label>
      <input
        className="in"
        id="as"
        type="search"
        placeholder="Search questions or keywords..."
        style={{ maxWidth: '360px' }}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="row" style={{ margin: '14px 0 16px' }}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            active={selectedCat === cat}
            onClick={() => setSelectedCat(cat)}
          >
            {cat}
          </Chip>
        ))}
      </div>

      <div className="grid2">
        {filteredAnswers.length === 0 ? (
          <div className="glass card empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <b>No answers match</b>
            <p className="hint">Try another search keyword or select a different category.</p>
          </div>
        ) : (
          filteredAnswers.map((item) => {
            const capitalizedCat =
              item.category.charAt(0).toUpperCase() + item.category.slice(1);
            const pillVariant = PILL_VARIANTS[capitalizedCat] || 'a';
            const isCopied = copiedId === item.id;

            return (
              <Card key={item.id}>
                <Pill variant={pillVariant}>{capitalizedCat}</Pill>
                <h3 style={{ fontSize: '17px', margin: '10px 0 6px' }}>
                  {item.question}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
                  {item.answer}
                </p>
                <div className="row" style={{ marginTop: '14px' }}>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => handleCopy(item.id, item.answer)}
                  >
                    {isCopied ? 'Copied' : 'Copy answer'}
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    aria-label={`Delete answer for ${item.question}`}
                    onClick={() => onDelete(item.id)}
                  >
                    Delete
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
        title={editingAnswer ? 'Edit answer' : 'Add answer'}
      >
        <form onSubmit={handleModalSubmit} noValidate>
          <div className="stack" style={{ margin: '16px 0' }}>
            <div>
              <label className="f" htmlFor="ans-cat">Category</label>
              <select
                className="in"
                id="ans-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as AnswerCategory)}
              >
                <option value="Behavioral">Behavioral</option>
                <option value="Technical">Technical</option>
                <option value="Projects">Projects</option>
                <option value="Salary">Salary</option>
                <option value="Availability">Availability</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="f" htmlFor="ans-q">Question *</label>
              <input
                className="in"
                id="ans-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Why do you want to work here?"
                autoFocus
              />
            </div>
            <div>
              <label className="f" htmlFor="ans-a">Answer *</label>
              <textarea
                className="in"
                id="ans-a"
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your polished response..."
              />
            </div>
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
