const DB_NAME = 'JobMateDB';
const DB_VERSION = 2;

export const STORES = {
  PROFILES: 'profiles',
  EDUCATION: 'education',
  EXPERIENCE: 'experience',
  SKILLS: 'skills',
  RESUMES: 'resumes',
  PROJECTS: 'projects',
  ANSWERS: 'answers',
  APPLICATIONS: 'applications',
  SAVED_JOBS: 'saved_jobs',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

class IndexedDBClient {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      // Check if indexedDB is available (e.g., in node / SSR test envs)
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB;
      if (!idb) {
        reject(new Error('IndexedDB is not available in this environment.'));
        return;
      }

      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Profiles store
        if (!db.objectStoreNames.contains(STORES.PROFILES)) {
          db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
        }

        // Education store
        if (!db.objectStoreNames.contains(STORES.EDUCATION)) {
          const store = db.createObjectStore(STORES.EDUCATION, { keyPath: 'id' });
          store.createIndex('institution', 'institution', { unique: false });
        }

        // Experience store
        if (!db.objectStoreNames.contains(STORES.EXPERIENCE)) {
          const store = db.createObjectStore(STORES.EXPERIENCE, { keyPath: 'id' });
          store.createIndex('companyName', 'companyName', { unique: false });
        }

        // Skills store
        if (!db.objectStoreNames.contains(STORES.SKILLS)) {
          const store = db.createObjectStore(STORES.SKILLS, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
        }

        // Resumes store (stores Blobs)
        if (!db.objectStoreNames.contains(STORES.RESUMES)) {
          const store = db.createObjectStore(STORES.RESUMES, { keyPath: 'id' });
          store.createIndex('isDefault', 'isDefault', { unique: false });
        }

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }

        // Answers store
        if (!db.objectStoreNames.contains(STORES.ANSWERS)) {
          const store = db.createObjectStore(STORES.ANSWERS, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
        }

        // Applications store
        if (!db.objectStoreNames.contains(STORES.APPLICATIONS)) {
          const store = db.createObjectStore(STORES.APPLICATIONS, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('companyName', 'companyName', { unique: false });
        }

        // Saved Jobs store
        if (!db.objectStoreNames.contains(STORES.SAVED_JOBS)) {
          const store = db.createObjectStore(STORES.SAVED_JOBS, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database upgrade blocked by another open tab/connection.');
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: StoreName, id: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ? (request.result as T) : null);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: StoreName, id: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllStores(): Promise<void> {
    for (const store of Object.values(STORES)) {
      await this.clear(store);
    }
  }
}

export const indexedDBClient = new IndexedDBClient();
