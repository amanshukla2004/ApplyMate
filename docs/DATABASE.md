# Database and Local Storage Design: JobMate

## 1. Local Storage Architecture (Local-First MVP)

JobMate stores all personal information directly in the user's browser, eliminating reliance on external servers.

### 1.1 IndexedDB (`JobMateDB`, Version 1)

| Object Store | Key Path | Indexes | Contents |
| :--- | :--- | :--- | :--- |
| `profiles` | `id` | — | Personal, address, professional links, preferences. |
| `education` | `id` | `institution` | Degrees, institutions, start/end years, GPA. |
| `experience`| `id` | `companyName` | Work roles, dates, descriptions, tech stacks. |
| `skills` | `id` | `category` | Categorized technical competencies & proficiencies. |
| `resumes` | `id` | `isDefault` | Resume metadata and **PDF binary Blobs**. |
| `projects` | `id` | — | Project portfolios, problem/solution, live/repo links. |
| `answers` | `id` | `category` | Reusable Q&A records, tags, related projects. |
| `applications` | `id` | `status`, `companyName` | Tracked job applications, dates, stage pipeline. |

### 1.2 Chrome Storage (`chrome.storage.local`)
Stores configuration and lightweight state:
- `jobmate_settings`: AI provider choices, API keys, autofill styling options, sound effects, theme.

---

## 2. Future Relational Database Schema (PostgreSQL)

When cloud synchronization is introduced, the relational schema maps seamlessly to the local models:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    address_line_1 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    job_url TEXT,
    application_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Applied',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
