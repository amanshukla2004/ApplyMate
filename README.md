# JobMate – Personal Job Application Assistant (Chrome Extension)

JobMate is a production-quality, privacy-first personal job application assistant and copilot built using React, TypeScript, Tailwind CSS, Vite, and Manifest V3.

It eliminates repetitive manual data entry across job portals (Greenhouse, Lever, Workday, LinkedIn, and generic web forms) while keeping you in 100% control of the application process.

---

## 🌟 Key Features

1. **Local-First & Zero Backend MVP**:
   - All personal information, work experience, projects, and answers reside in the user's browser.
   - Resumes (PDF binaries) are saved locally as `Blob` objects directly inside **IndexedDB**.
   - No external accounts, trackers, or servers required.

2. **Smart Form Detection & Autofill**:
   - **DOM Scanner**: Detects standard and framework-rendered inputs (`input`, `textarea`, `select`, `checkbox`, `radio`).
   - **Multi-Stage Field Matching**: Compares autocomplete tags, element attributes, IDs, and human-readable `<label>` elements against a canonical field taxonomy.
   - **Framework-Compliant Dispatcher**: Triggers React/Angular synthetic input and change events so framework state updates seamlessly.

3. **Portal Adapters**:
   - Out-of-the-box adapters for **Greenhouse**, **Lever**, **Workday**, **LinkedIn Easy Apply**, and standard **Generic Web Forms**.

4. **Multi-Interface Architecture**:
   - **Popup Window**: Fast glance at profile completeness, active tab status, and 1-click launch.
   - **Side Panel Copilot**: Keeps open alongside job application tabs to inspect detected fields, edit proposed values, prepare resumes, and autofill selected fields.
   - **Options Dashboard**: Full career profile manager covering Personal Details, Education, Work Experience, Skills, Resumes, Project Portfolios, Reusable Answer Bank, Application Tracker, and Data Backup/Restore.

5. **AI Application Copilot (Optional)**:
   - Grounded Q&A generator for behavioral and technical questions using your real experience and projects.
   - Supports configurable API keys for Groq (Llama 3.3) and Google Gemini with offline heuristic fallbacks.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Google Chrome (or any Chromium browser: Brave, Edge, Arc)

### Installation & Build

```bash
# Navigate to the extension folder
cd extension

# Install dependencies
npm install

# Run automated test suite
npm test

# Build production bundle
npm run build
```

The compiled, unpacked extension will be generated in `extension/dist/`.

---

## 📦 Loading the Extension into Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left.
4. Select the directory:
   `ApplyMate/extension/dist`
5. The **JobMate – Personal Job Application Assistant** will appear in your extensions list!
6. Pin JobMate to your browser toolbar for quick access.

---

## 🧪 Testing the Extension

We have included a dedicated local job application test portal:
1. Open the file `ApplyMate/test-portal/index.html` in your Chrome browser (or via a local HTTP server).
2. Click the JobMate icon in the toolbar or open the **Side Panel**.
3. Click **"Scan Form"**. Notice how JobMate instantly detects First Name, Last Name, Email, Phone, Address, City, Postal Code, LinkedIn, GitHub, and Work Authorization.
4. Click **"Fill Selected"** or **"Fill All Matched"** and observe the form being populated with framework change events triggered!

---

## 📁 Repository Structure

```text
ApplyMate/
├── extension/
│   ├── public/
│   │   └── manifest.json         # Chrome Extension Manifest V3
│   ├── src/
│   │   ├── popup/                # Extension Popup UI
│   │   ├── sidepanel/            # Extension Side Panel Copilot UI
│   │   ├── options/              # Full-page Profile & Settings Dashboard
│   │   ├── content/              # Webpage DOM scanner & autofill engine
│   │   ├── background/           # Service Worker & Message Router
│   │   ├── adapters/             # Greenhouse, Lever, Workday, LinkedIn adapters
│   │   ├── services/             # IndexedDB & Chrome Storage services
│   │   ├── types/                # Canonical field taxonomy & TypeScript models
│   │   └── styles/               # Tailwind CSS & global styles
│   ├── tests/                    # Vitest unit test suite
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── HLD.md                    # High-Level Architecture
│   ├── LLD.md                    # Low-Level Design & Algorithms
│   ├── DATABASE.md               # IndexedDB and PostgreSQL Schema
│   └── API.md                    # Messaging & API Contracts
├── test-portal/
│   └── index.html                # Local test application form
├── prompt.md                     # Master Project Specification
└── README.md
```

---

## 🛡️ Privacy & Security

- **Strictly Local Storage**: Your credentials, address, and PDF resumes remain within your Chrome profile storage.
- **Never Auto-Submits**: Form submissions require your manual review and intentional click on the job portal.
- **Safe Value Setting**: Uses native prototype setters and sandboxed message isolation.
