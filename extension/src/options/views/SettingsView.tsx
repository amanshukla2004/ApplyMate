import React, { useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Pill } from '../../components/ui/Pill';
import { AppSettings } from '../../types/profile';

export interface SettingsViewProps {
  settings: AppSettings | null;
  onUpdateSettings: (updated: Partial<AppSettings>) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (json: string) => Promise<void>;
  onWipeData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onWipeData,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(settings?.aiApiKey || '');
  const [provider, setProvider] = useState<'groq' | 'gemini' | 'custom'>(settings?.aiProvider || 'groq');
  const [wipeConfirmStep, setWipeConfirmStep] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAiEnabled = settings?.aiEnabled ?? true;
  const hasKey = Boolean(apiKeyInput.trim() || settings?.aiApiKey);

  const handleKeyChange = (val: string) => {
    setApiKeyInput(val);
    onUpdateSettings({ aiApiKey: val });
  };

  const handleProviderChange = (val: 'groq' | 'gemini' | 'custom') => {
    setProvider(val);
    onUpdateSettings({ aiProvider: val });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        await onImportBackup(content);
      }
    };
    reader.readAsText(file);
  };

  const handleWipeConfirm = async () => {
    if (deleteInputText === 'DELETE') {
      await onWipeData();
      setWipeSuccess(true);
      setWipeConfirmStep(false);
    }
  };

  return (
    <div className="view" id="v-settings">
      <div className="stack">
        {/* AI Copilot Card */}
        <Card>
          <div className="row sp">
            <div>
              <h2 style={{ fontSize: '22px' }}>AI Copilot</h2>
              <p className="hint">Drafts answers from your saved experience and projects.</p>
            </div>
            <Switch
              checked={isAiEnabled}
              onChange={(checked) => onUpdateSettings({ aiEnabled: checked })}
              label="AI Copilot"
            />
          </div>

          <form className="grid2" style={{ marginTop: '16px' }} onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="f" htmlFor="pv">AI provider</label>
              <select
                className="in"
                id="pv"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as 'groq' | 'gemini' | 'custom')}
              >
                <option value="groq">Groq (Llama 3.3)</option>
                <option value="gemini">Google Gemini</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>
            <div>
              <label className="f" htmlFor="ak">API key</label>
              <input
                className="in"
                id="ak"
                type="password"
                placeholder="Paste API key here"
                value={apiKeyInput}
                onChange={(e) => handleKeyChange(e.target.value)}
              />
              <p className="hint">Stored only in your local Chrome browser storage.</p>
            </div>
          </form>

          <div style={{ marginTop: '12px' }}>
            <Pill variant={hasKey ? 'm' : 'r'}>
              {hasKey ? 'API key saved' : 'API key missing'}
            </Pill>
          </div>
        </Card>

        {/* Backup and Restore Card */}
        <Card>
          <h2 style={{ fontSize: '22px' }}>Backup and restore</h2>
          <p className="hint" style={{ margin: '4px 0 14px' }}>
            Export everything as a single JSON file, or restore from a previous backup.
          </p>
          <div className="row">
            <Button variant="soft" onClick={onExportBackup}>
              Export backup
            </Button>
            <Button variant="soft" onClick={() => fileInputRef.current?.click()}>
              Import backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
          </div>
        </Card>

        {/* Appearance Card */}
        <Card>
          <h2 style={{ fontSize: '22px' }}>Appearance</h2>
          <p className="hint" style={{ margin: '4px 0 14px' }}>
            Use the Light / Dark theme button and Calm mode toggle in the top header.
          </p>
        </Card>

        {/* Wipe Data Card */}
        <Card>
          <h2 style={{ fontSize: '22px' }}>Wipe all local data</h2>
          <p className="hint" style={{ margin: '4px 0 14px' }}>
            Deletes your profile, resumes, answers, and pipeline from this browser. This cannot be undone.
          </p>

          <div id="wz">
            {wipeSuccess ? (
              <Pill variant="m">All local data wiped successfully</Pill>
            ) : !wipeConfirmStep ? (
              <Button variant="danger" onClick={() => setWipeConfirmStep(true)}>
                Wipe all data
              </Button>
            ) : (
              <div className="stack" style={{ maxWidth: '360px' }}>
                <label className="f" htmlFor="wc">Type DELETE to confirm</label>
                <div className="row">
                  <input
                    className="in"
                    id="wc"
                    style={{ maxWidth: '180px' }}
                    value={deleteInputText}
                    onChange={(e) => setDeleteInputText(e.target.value)}
                    autoFocus
                  />
                  <Button
                    variant="danger"
                    disabled={deleteInputText !== 'DELETE'}
                    onClick={handleWipeConfirm}
                  >
                    Wipe now
                  </Button>
                  <Button variant="soft" onClick={() => setWipeConfirmStep(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
