# High-Level Design (HLD): JobMate / ApplyMate

## 1. System Overview

JobMate is a client-first, privacy-centric Chrome Extension engineered to accelerate software engineering job applications. It stores user career information, resumes, and answers directly in the browser's persistent storage (IndexedDB and Chrome Storage) and automatically maps, reviews, and populates application forms across various ATS (Applicant Tracking System) platforms.

## 2. Architecture Diagram

```text
                  JOB APPLICATION WEBSITE (DOM)
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
    Content Script                        Application Form
 (DOM Scanner, Matcher,             (Greenhouse, Lever, Workday,
  Autofill Engine, Observers)        LinkedIn, Generic HTML)
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                    Chrome Runtime Messaging
                               │
                   Background Service Worker
              (Message Routing, Active Tab Mgmt)
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
      Chrome Side Panel                      Popup Window
   (Scan, Preview, Fill,                 (Status, Quick Links,
    AI Q&A, Resume Select)                Profile Score)
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                       Options Dashboard
                  (Profile, Education, Experience,
                   Skills, Resumes, Answer Bank,
                   Application Tracker, Settings)
                               │
                   Unified Storage Service
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
      Chrome Storage                         IndexedDB
     (App Settings, UI)                (Profiles, Education,
                                        Experience, Skills,
                                        Resume Blobs, Answers,
                                        Applications)
```

## 3. Core Component Responsibilities

### 3.1 Content Script (`src/content/`)
- **DOM Scanner**: Locates interactive inputs (`input`, `textarea`, `select`), excluding hidden/CSRF/security controls.
- **Label Extractor**: Resolves human-readable labels from `<label for>`, enclosing labels, `aria-label`, `aria-labelledby`, placeholders, and layout headers.
- **Field Matcher**: Applies heuristic and alias matching with confidence scoring against canonical fields.
- **Autofill Engine**: Populates fields using native property descriptors and triggers synthetic bubbling events (`input`, `change`, `blur`) for modern reactive frameworks (React, Angular, Vue).

### 3.2 Background Service Worker (`src/background/`)
- Relays messages between extension UI components and the active tab's content script.
- Handles tab lifecycle and programmatic injection when navigating new portals.

### 3.3 UI Layer (`src/popup/`, `src/sidepanel/`, `src/options/`)
- **Popup**: Lightweight status display, completion score, and launch buttons.
- **Side Panel**: Persistent copilot during job applications, providing form field inspection, inline edits, resume selection, and AI question answering.
- **Options Dashboard**: Full-page management interface for personal details, education, experience, technical skills, PDF resume blobs, answer repository, and application pipeline.

### 3.4 Storage Layer (`src/services/storage/`)
- **IndexedDB**: Object stores with indexes for relational profile data and raw PDF resume Blobs.
- **Chrome Storage**: Local settings, AI provider configuration, and theme preferences.
