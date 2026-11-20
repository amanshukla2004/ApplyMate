import 'fake-indexeddb/auto';

// Mock chrome APIs for testing environment
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: {
    sendMessage: (_msg: unknown, callback?: (res: unknown) => void) => {
      callback?.({ success: true });
    },
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
    openOptionsPage: () => {},
  },
  tabs: {
    query: (_query: unknown, callback?: (tabs: unknown[]) => void) => {
      callback?.([{ id: 1, title: 'Job Application', url: 'https://boards.greenhouse.io/test/jobs/1' }]);
    },
    sendMessage: (_id: number, _msg: unknown, callback?: (res: unknown) => void) => {
      callback?.({ success: true });
    },
  },
  storage: {
    local: {
      get: (_keys: unknown, callback: (items: Record<string, unknown>) => void) => callback({}),
      set: (_items: unknown, callback?: () => void) => callback?.(),
      remove: (_keys: unknown, callback?: () => void) => callback?.(),
    },
  },
};
