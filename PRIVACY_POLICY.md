# Privacy Policy for ApplyMate

**Last Updated: November 2026**

**ApplyMate** ("we", "our", or "the Extension") is an open-source, privacy-first personal job application assistant built as a Google Chrome Extension. We are firmly committed to protecting your privacy and ensuring your personal information remains strictly in your own control.

---

### 1. 100% Local-First Data Storage
- **All your data stays on your machine**: Your profile details, education history, work experience, resume documents, and answer bank entries are stored strictly inside your browser's local sandbox using **IndexedDB** and **Chrome Storage Local (`chrome.storage.local`)**.
- **No Remote Tracking or Analytics**: ApplyMate does **NOT** operate any remote tracking servers, telemetry collectors, or analytics dashboards. We do not track which jobs you apply to, what companies you view, or your personal identification information.

---

### 2. Permissions Justification
Chrome Web Store requires explicit justification for extension permissions:

| Permission | Purpose & Usage |
| :--- | :--- |
| **`storage`** | Stores your candidate profile, personal answer bank, application pipeline status, and visual preferences locally in your browser. |
| **`sidePanel`** | Renders the assistive job copilot in Chrome's native side panel next to the job application you are filling. |
| **`activeTab` & `tabs`** | Enables the side panel and popup to identify the current tab URL and trigger form scanning when requested by the user. |
| **`scripting`** | Injects the client-side form scanner and autofill adapter to detect form inputs (e.g. Workday, Greenhouse, Lever) on the page you are viewing. |
| **`<all_urls>`** | Job applications are hosted across thousands of independent company career subdomains (`*.myworkdayjobs.com`, `boards.greenhouse.io`, `jobs.lever.co`, custom company domains). This permission allows ApplyMate to detect and assist filling forms across any legitimate job portal. |

---

### 3. Optional Third-Party AI Services
- If you configure an optional AI Copilot (e.g. Google Gemini API or OpenAI API), API requests for drafting answers or formatting responses are sent **directly from your browser client to the chosen API provider's endpoint** using the API key you provide.
- Your API key is encrypted and stored locally in your browser's extension storage. It is never transmitted to us or any third party.

---

### 4. Data Sharing & Disclosure
- We do **NOT** sell, rent, trade, or share any personal information with third parties.
- We do **NOT** run advertisements or monetize user data.

---

### 5. Data Retention and Deletion
- You have complete control over your data.
- You can export a full JSON backup of your profile, answers, and applications at any time from the **Settings & Data** tab.
- You can permanently wipe all stored data at any time using the two-step **"Wipe All Data"** button in the Settings tab, or by uninstalling the extension from `chrome://extensions`.

---

### 6. Contact & Source Code
ApplyMate is an open, user-first tool. For questions, issues, or contributions, please open an issue in the project's GitHub repository.
