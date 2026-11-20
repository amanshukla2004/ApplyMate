export type ApplicationField =
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'ADDRESS_LINE_2'
  | 'CITY'
  | 'STATE'
  | 'COUNTRY'
  | 'ZIP_CODE'
  | 'LINKEDIN_URL'
  | 'GITHUB_URL'
  | 'PORTFOLIO_URL'
  | 'COLLEGE'
  | 'DEGREE'
  | 'BRANCH'
  | 'CGPA'
  | 'GRADUATION_YEAR'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'NOTICE_PERIOD'
  | 'CURRENT_CTC'
  | 'EXPECTED_CTC'
  | 'WORK_AUTHORIZATION'
  | 'RELOCATION'
  | 'RESUME'
  | 'COVER_LETTER'
  | 'GENDER'
  | 'HEARD_ABOUT_US';

export interface CanonicalFieldDefinition {
  id: ApplicationField;
  displayLabel: string;
  category: 'personal' | 'contact' | 'address' | 'links' | 'education' | 'experience' | 'preferences' | 'files' | 'other';
  dataType: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select' | 'radio' | 'file';
  aliases: string[];
  sensitive: boolean;
  requiredByDefault?: boolean;
}

export const CANONICAL_FIELDS: Record<ApplicationField, CanonicalFieldDefinition> = {
  FIRST_NAME: {
    id: 'FIRST_NAME',
    displayLabel: 'First Name',
    category: 'personal',
    dataType: 'text',
    aliases: ['first name', 'firstname', 'fname', 'first_name', 'given name', 'forename'],
    sensitive: false,
  },
  LAST_NAME: {
    id: 'LAST_NAME',
    displayLabel: 'Last Name',
    category: 'personal',
    dataType: 'text',
    aliases: ['last name', 'lastname', 'lname', 'last_name', 'surname', 'family name'],
    sensitive: false,
  },
  FULL_NAME: {
    id: 'FULL_NAME',
    displayLabel: 'Full Name',
    category: 'personal',
    dataType: 'text',
    aliases: ['full name', 'fullname', 'name', 'candidate name', 'applicant name'],
    sensitive: false,
  },
  EMAIL: {
    id: 'EMAIL',
    displayLabel: 'Email Address',
    category: 'contact',
    dataType: 'email',
    aliases: ['email', 'email address', 'e-mail', 'mail', 'contact email'],
    sensitive: false,
  },
  PHONE: {
    id: 'PHONE',
    displayLabel: 'Phone Number',
    category: 'contact',
    dataType: 'tel',
    aliases: ['phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'tel', 'cell', 'contact number'],
    sensitive: false,
  },
  ADDRESS: {
    id: 'ADDRESS',
    displayLabel: 'Address Line 1',
    category: 'address',
    dataType: 'text',
    aliases: ['address', 'street address', 'street', 'address line 1', 'address1', 'current address'],
    sensitive: false,
  },
  ADDRESS_LINE_2: {
    id: 'ADDRESS_LINE_2',
    displayLabel: 'Address Line 2',
    category: 'address',
    dataType: 'text',
    aliases: ['address line 2', 'address 2', 'address2', 'apt', 'suite', 'unit'],
    sensitive: false,
  },
  CITY: {
    id: 'CITY',
    displayLabel: 'City',
    category: 'address',
    dataType: 'text',
    aliases: ['city', 'town', 'municipality'],
    sensitive: false,
  },
  STATE: {
    id: 'STATE',
    displayLabel: 'State / Province',
    category: 'address',
    dataType: 'text',
    aliases: ['state', 'province', 'region', 'state/province'],
    sensitive: false,
  },
  COUNTRY: {
    id: 'COUNTRY',
    displayLabel: 'Country',
    category: 'address',
    dataType: 'text',
    aliases: ['country', 'nation', 'country of residence'],
    sensitive: false,
  },
  ZIP_CODE: {
    id: 'ZIP_CODE',
    displayLabel: 'Postal / Zip Code',
    category: 'address',
    dataType: 'text',
    aliases: ['zip', 'zip code', 'zipcode', 'postal code', 'postcode', 'pin code', 'pincode'],
    sensitive: false,
  },
  LINKEDIN_URL: {
    id: 'LINKEDIN_URL',
    displayLabel: 'LinkedIn Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin link'],
    sensitive: false,
  },
  GITHUB_URL: {
    id: 'GITHUB_URL',
    displayLabel: 'GitHub Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['github', 'github profile', 'github url', 'git profile'],
    sensitive: false,
  },
  PORTFOLIO_URL: {
    id: 'PORTFOLIO_URL',
    displayLabel: 'Portfolio / Website URL',
    category: 'links',
    dataType: 'url',
    aliases: ['portfolio', 'website', 'personal website', 'portfolio url', 'personal link', 'blog'],
    sensitive: false,
  },
  COLLEGE: {
    id: 'COLLEGE',
    displayLabel: 'College / University',
    category: 'education',
    dataType: 'text',
    aliases: ['university', 'college', 'institution', 'school', 'institute name', 'alma mater'],
    sensitive: false,
  },
  DEGREE: {
    id: 'DEGREE',
    displayLabel: 'Degree',
    category: 'education',
    dataType: 'text',
    aliases: ['degree', 'qualification', 'degree name', 'education level', 'highest degree'],
    sensitive: false,
  },
  BRANCH: {
    id: 'BRANCH',
    displayLabel: 'Discipline / Branch / Major',
    category: 'education',
    dataType: 'text',
    aliases: ['major', 'branch', 'discipline', 'field of study', 'specialization', 'stream'],
    sensitive: false,
  },
  CGPA: {
    id: 'CGPA',
    displayLabel: 'CGPA / Percentage',
    category: 'education',
    dataType: 'text',
    aliases: ['cgpa', 'gpa', 'grade', 'percentage', 'marks', 'score'],
    sensitive: false,
  },
  GRADUATION_YEAR: {
    id: 'GRADUATION_YEAR',
    displayLabel: 'Graduation Year',
    category: 'education',
    dataType: 'text',
    aliases: ['graduation year', 'grad year', 'year of completion', 'passing year', 'year of graduation', 'end year'],
    sensitive: false,
  },
  SKILLS: {
    id: 'SKILLS',
    displayLabel: 'Key Skills',
    category: 'experience',
    dataType: 'textarea',
    aliases: ['skills', 'key skills', 'technical skills', 'technologies', 'core competencies'],
    sensitive: false,
  },
  EXPERIENCE: {
    id: 'EXPERIENCE',
    displayLabel: 'Total Experience (Years)',
    category: 'experience',
    dataType: 'text',
    aliases: ['total experience', 'years of experience', 'experience years', 'relevant experience', 'work experience'],
    sensitive: false,
  },
  NOTICE_PERIOD: {
    id: 'NOTICE_PERIOD',
    displayLabel: 'Notice Period (Days/Months)',
    category: 'preferences',
    dataType: 'text',
    aliases: ['notice period', 'notice', 'availability to join', 'how soon can you start', 'earliest start date'],
    sensitive: false,
  },
  CURRENT_CTC: {
    id: 'CURRENT_CTC',
    displayLabel: 'Current Compensation / CTC',
    category: 'preferences',
    dataType: 'text',
    aliases: ['current ctc', 'current salary', 'current compensation', 'present salary'],
    sensitive: true,
  },
  EXPECTED_CTC: {
    id: 'EXPECTED_CTC',
    displayLabel: 'Expected Compensation / CTC',
    category: 'preferences',
    dataType: 'text',
    aliases: ['expected ctc', 'expected salary', 'desired salary', 'salary expectation', 'compensation expectations'],
    sensitive: true,
  },
  WORK_AUTHORIZATION: {
    id: 'WORK_AUTHORIZATION',
    displayLabel: 'Work Authorization',
    category: 'preferences',
    dataType: 'select',
    aliases: ['work authorization', 'authorized to work', 'visa sponsorship', 'require sponsorship', 'eligible to work', 'legally authorized'],
    sensitive: false,
  },
  RELOCATION: {
    id: 'RELOCATION',
    displayLabel: 'Willingness to Relocate',
    category: 'preferences',
    dataType: 'select',
    aliases: ['willing to relocate', 'relocation', 'relocate', 'open to relocation'],
    sensitive: false,
  },
  RESUME: {
    id: 'RESUME',
    displayLabel: 'Resume / CV',
    category: 'files',
    dataType: 'file',
    aliases: ['resume', 'cv', 'curriculum vitae', 'attach resume', 'upload resume', 'resume/cv'],
    sensitive: false,
  },
  COVER_LETTER: {
    id: 'COVER_LETTER',
    displayLabel: 'Cover Letter',
    category: 'files',
    dataType: 'textarea',
    aliases: ['cover letter', 'coverletter', 'attach cover letter', 'upload cover letter', 'note to hiring manager'],
    sensitive: false,
  },
  GENDER: {
    id: 'GENDER',
    displayLabel: 'Gender (Optional)',
    category: 'personal',
    dataType: 'select',
    aliases: ['gender', 'sex'],
    sensitive: true,
  },
  HEARD_ABOUT_US: {
    id: 'HEARD_ABOUT_US',
    displayLabel: 'How did you hear about us?',
    category: 'other',
    dataType: 'select',
    aliases: ['how did you hear', 'source', 'referral', 'where did you find us', 'referral source'],
    sensitive: false,
  },
};
