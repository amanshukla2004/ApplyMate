import React from 'react';
import { Button } from '../../components/ui/Button';

export interface SaveBarProps {
  show: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({ show, onSave, onDiscard }) => {
  if (!show) return null;

  return (
    <div className="savebar glass" id="sb" role="status">
      <span style={{ fontWeight: 500 }}>You have unsaved changes</span>
      <div className="row">
        <Button variant="soft" size="sm" id="disc" onClick={onDiscard}>
          Discard
        </Button>
        <Button size="sm" id="save" onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
};
