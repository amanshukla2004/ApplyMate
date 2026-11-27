import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type CalmMode = 'on' | 'off';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [calm, setCalmState] = useState<CalmMode>('off');

  useEffect(() => {
    // Read initial theme and calm settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['theme', 'calm'], (res) => {
        if (res.theme) {
          setThemeState(res.theme as ThemeMode);
          applyTheme(res.theme as ThemeMode);
        } else {
          applyTheme('system');
        }
        if (res.calm) {
          setCalmState(res.calm as CalmMode);
          applyCalm(res.calm as CalmMode);
        }
      });

      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
        if (area === 'local') {
          if (changes.theme) {
            const next = (changes.theme.newValue as ThemeMode) || 'system';
            setThemeState(next);
            applyTheme(next);
          }
          if (changes.calm) {
            const next = (changes.calm.newValue as CalmMode) || 'off';
            setCalmState(next);
            applyCalm(next);
          }
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    } else {
      const savedTheme =
        (localStorage.getItem('applymate_theme') as ThemeMode) ||
        (localStorage.getItem('jobmate_theme') as ThemeMode) ||
        'system';
      const savedCalm =
        (localStorage.getItem('applymate_calm') as CalmMode) ||
        (localStorage.getItem('jobmate_calm') as CalmMode) ||
        'off';
      setThemeState(savedTheme);
      setCalmState(savedCalm);
      applyTheme(savedTheme);
      applyCalm(savedCalm);
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
  };

  const applyCalm = (mode: CalmMode) => {
    const root = document.documentElement;
    if (mode === 'on') {
      root.setAttribute('data-calm', 'on');
    } else {
      root.removeAttribute('data-calm');
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: mode });
    } else {
      localStorage.setItem('applymate_theme', mode);
    }
  };

  const toggleTheme = () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(nextMode);
  };

  const toggleCalm = () => {
    const nextCalm: CalmMode = calm === 'on' ? 'off' : 'on';
    setCalmState(nextCalm);
    applyCalm(nextCalm);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ calm: nextCalm });
    } else {
      localStorage.setItem('applymate_calm', nextCalm);
    }
  };

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme,
    isDarkMode,
    calm,
    isCalm: calm === 'on',
    setTheme,
    toggleTheme,
    toggleCalm,
  };
}
