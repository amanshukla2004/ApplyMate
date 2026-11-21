export type ApplicationField =
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'PREFERRED_NAME'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'ADDRESS_LINE_2'
  | 'CITY'
  | 'STATE'
  | 'COUNTRY'
  | 'ZIP_CODE'
  | 'FULL_LOCATION'
  | 'LINKEDIN_URL'
  | 'GITHUB_URL'
  | 'PORTFOLIO_URL'
  | 'FACEBOOK_URL'
  | 'TWITTER_URL'
  | 'COLLEGE'
  | 'DEGREE'
  | 'BRANCH'
  | 'CGPA'
  | 'GRADUATION_YEAR'
  | 'START_MONTH'
  | 'START_YEAR'
  | 'END_MONTH'
  | 'END_YEAR'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'NOTICE_PERIOD'
  | 'CURRENT_CTC'
  | 'EXPECTED_CTC'
  | 'WORK_AUTHORIZATION'
  | 'VISA_SPONSORSHIP'
  | 'RELOCATION'
  | 'BACKLOGS'
  | 'INTERNSHIP_DURATION'
  | 'IN_OFFICE'
  | 'US_CITIZEN'
  | 'CITIZENSHIP'
  | 'FOREIGN_RESIDENCY'
  | 'FOREIGN_RESIDENCY_NON_CITIZEN'
  | 'FUTURE_OPPORTUNITIES'
  | 'CONSENT_DATA_PROTECTION'
  | 'CONSENT_TERMS'
  | 'CONSENT_DEMOGRAPHIC'
  | 'RESUME'
  | 'COVER_LETTER'
  | 'GENDER'
  | 'RACE_ETHNICITY'
  | 'VETERAN_STATUS'
  | 'DISABILITY_STATUS'
  | 'HEARD_ABOUT_US'
  | 'UNIVERSITY_NOC';

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
  PREFERRED_NAME: {
    id: 'PREFERRED_NAME',
    displayLabel: 'Preferred First Name',
    category: 'personal',
    dataType: 'text',
    aliases: ['preferred first name', 'preferred name', 'nickname', 'chosen name'],
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
  FULL_LOCATION: {
    id: 'FULL_LOCATION',
    displayLabel: 'Full Location (City, State, Country)',
    category: 'address',
    dataType: 'text',
    aliases: [
      'in which city state province and country are you currently based',
      'currently based',
      'location city',
      'current location',
      'based in',
      'city state and country',
      'present location',
    ],
    sensitive: false,
  },
  LINKEDIN_URL: {
    id: 'LINKEDIN_URL',
    displayLabel: 'LinkedIn Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin link', 'linked in', 'linked in s', 'linkedin s', 'social linkedin'],
    sensitive: false,
  },
  GITHUB_URL: {
    id: 'GITHUB_URL',
    displayLabel: 'GitHub Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['github', 'github profile', 'github url', 'git profile', 'git hub'],
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
  FACEBOOK_URL: {
    id: 'FACEBOOK_URL',
    displayLabel: 'Facebook Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['facebook', 'facebook profile', 'facebook url', 'facebook link', 'face book', 'facebook s', 'social facebook'],
    sensitive: false,
  },
  TWITTER_URL: {
    id: 'TWITTER_URL',
    displayLabel: 'Twitter / X Profile URL',
    category: 'links',
    dataType: 'url',
    aliases: ['twitter', 'twitter profile', 'twitter url', 'x profile', 'twitter link', 'twitter s'],
    sensitive: false,
  },
  COLLEGE: {
    id: 'COLLEGE',
    displayLabel: 'College / University',
    category: 'education',
    dataType: 'text',
    aliases: [
      'university',
      'college',
      'institution',
      'school',
      'institute name',
      'alma mater',
      'which college or school are you currently attending',
      'school attending',
      'college attending',
      'current college',
    ],
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
    aliases: [
      'cgpa',
      'gpa',
      'grade',
      'percentage',
      'marks',
      'score',
      'cumulative grade point average',
      'cumulative gpa',
    ],
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
  START_MONTH: {
    id: 'START_MONTH',
    displayLabel: 'Education Start Month',
    category: 'education',
    dataType: 'select',
    aliases: ['start date month', 'start month', 'education start month', 'from month'],
    sensitive: false,
  },
  START_YEAR: {
    id: 'START_YEAR',
    displayLabel: 'Education Start Year',
    category: 'education',
    dataType: 'text',
    aliases: ['start date year', 'start year', 'education start year', 'from year'],
    sensitive: false,
  },
  END_MONTH: {
    id: 'END_MONTH',
    displayLabel: 'Education End Month',
    category: 'education',
    dataType: 'select',
    aliases: ['end date month', 'end month', 'education end month', 'to month'],
    sensitive: false,
  },
  END_YEAR: {
    id: 'END_YEAR',
    displayLabel: 'Education End Year',
    category: 'education',
    dataType: 'text',
    aliases: ['end date year', 'end year', 'education end year', 'to year'],
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
    aliases: ['notice period', 'notice period days', 'employment notice', 'availability to join', 'how soon can you start', 'earliest start date'],
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
    aliases: [
      'willing to relocate',
      'relocation',
      'relocate',
      'open to relocation',
      'relocate at your own expense if needed',
      'willing to relocate at your own expense',
    ],
    sensitive: false,
  },
  VISA_SPONSORSHIP: {
    id: 'VISA_SPONSORSHIP',
    displayLabel: 'Visa Sponsorship Requirement',
    category: 'preferences',
    dataType: 'select',
    aliases: [
      'will you now or in the future require sponsorship for employment visa status',
      'require sponsorship for employment visa status',
      'visa sponsorship',
      'sponsorship required',
      'require visa sponsorship',
    ],
    sensitive: false,
  },
  BACKLOGS: {
    id: 'BACKLOGS',
    displayLabel: 'Active Backlogs / Academic Arrears',
    category: 'education',
    dataType: 'select',
    aliases: [
      'do you have any active backlogs academic arrears',
      'active backlogs',
      'academic arrears',
      'backlogs',
      'any active backlogs',
    ],
    sensitive: false,
  },
  INTERNSHIP_DURATION: {
    id: 'INTERNSHIP_DURATION',
    displayLabel: 'Internship Availability / Duration',
    category: 'preferences',
    dataType: 'select',
    aliases: [
      'are you available for a 6 month internship',
      'available for a 6 month internship',
      'internship duration',
      'available for internship',
      '6 month internship',
    ],
    sensitive: false,
  },
  IN_OFFICE: {
    id: 'IN_OFFICE',
    displayLabel: 'In-Office Attendance Requirement',
    category: 'preferences',
    dataType: 'select',
    aliases: [
      'are you willing to report to the office at least 3 days a week',
      'report to the office at least 3 days a week',
      'report to the office',
      'in office attendance',
      'hybrid policy',
    ],
    sensitive: false,
  },
  US_CITIZEN: {
    id: 'US_CITIZEN',
    displayLabel: 'U.S. Citizen / Permanent Resident Status',
    category: 'preferences',
    dataType: 'select',
    aliases: [
      'are you a u s citizen',
      'u s citizen u s national',
      'lawful permanent resident alien',
      'green card holder',
      'us citizen',
      'trade control screening',
    ],
    sensitive: false,
  },
  CITIZENSHIP: {
    id: 'CITIZENSHIP',
    displayLabel: 'Country of Citizenship',
    category: 'personal',
    dataType: 'select',
    aliases: [
      'please list each country where you hold citizenship',
      'country where you hold citizenship',
      'citizenship country',
      'primary citizenship',
      'nationality',
    ],
    sensitive: false,
  },
  FOREIGN_RESIDENCY: {
    id: 'FOREIGN_RESIDENCY',
    displayLabel: 'Foreign Permanent Residency (5 Years)',
    category: 'personal',
    dataType: 'select',
    aliases: [
      'please list each country during the past five years where you held permanent resident status but were not a citizen',
      'permanent resident status but were not a citizen',
      'foreign permanent residency',
    ],
    sensitive: false,
  },
  FOREIGN_RESIDENCY_NON_CITIZEN: {
    id: 'FOREIGN_RESIDENCY_NON_CITIZEN',
    displayLabel: 'Foreign Non-Citizen Residency (5 Years)',
    category: 'personal',
    dataType: 'select',
    aliases: [
      'please list each country during the past five years where you resided but were not a citizen or permanent resident',
      'resided but were not a citizen or permanent resident',
      'foreign residency visa',
    ],
    sensitive: false,
  },
  FUTURE_OPPORTUNITIES: {
    id: 'FUTURE_OPPORTUNITIES',
    displayLabel: 'Future Job Opportunities Consent',
    category: 'preferences',
    dataType: 'select',
    aliases: [
      'would you like nasdaq to keep your application details and contact you about other job opportunities in the future',
      'keep your application details and contact you about other job opportunities',
      'contact you about other job opportunities',
      'future job opportunities',
      'talent community',
    ],
    sensitive: false,
  },
  CONSENT_DATA_PROTECTION: {
    id: 'CONSENT_DATA_PROTECTION',
    displayLabel: 'Data Protection Notice Consent',
    category: 'other',
    dataType: 'select',
    aliases: [
      'job applicant data protection notice',
      'data protection notice',
      'i have read and acknowledge the job applicant data protection notice',
      'applicant privacy policy',
      'privacy notice consent',
    ],
    sensitive: false,
  },
  CONSENT_TERMS: {
    id: 'CONSENT_TERMS',
    displayLabel: 'Terms & Conditions Certification',
    category: 'other',
    dataType: 'select',
    aliases: [
      'terms and conditions',
      'certification authorization',
      'yes i have read and consent to the terms and conditions',
      'certification and authorization',
      'declaration and consent',
    ],
    sensitive: false,
  },
  CONSENT_DEMOGRAPHIC: {
    id: 'CONSENT_DEMOGRAPHIC',
    displayLabel: 'Voluntary Demographic Consent',
    category: 'other',
    dataType: 'select',
    aliases: [
      'voluntary demographic data notice and consent',
      'demographic data notice',
      'consent to processing of sensitive personal information',
    ],
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
    aliases: ['gender', 'sex', 'gender identity'],
    sensitive: true,
  },
  RACE_ETHNICITY: {
    id: 'RACE_ETHNICITY',
    displayLabel: 'Race / Ethnicity (Optional)',
    category: 'personal',
    dataType: 'select',
    aliases: ['race', 'ethnicity', 'race/ethnicity', 'ethnic origin', 'racial background', 'demographic race', 'ethnic background'],
    sensitive: true,
  },
  VETERAN_STATUS: {
    id: 'VETERAN_STATUS',
    displayLabel: 'Veteran Status (Optional)',
    category: 'preferences',
    dataType: 'select',
    aliases: ['veteran', 'veteran status', 'protected veteran', 'military status'],
    sensitive: true,
  },
  DISABILITY_STATUS: {
    id: 'DISABILITY_STATUS',
    displayLabel: 'Disability Status (Optional)',
    category: 'preferences',
    dataType: 'select',
    aliases: ['disability', 'disability status', 'physical disability', 'handicap'],
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
  UNIVERSITY_NOC: {
    id: 'UNIVERSITY_NOC',
    displayLabel: 'University No Objection Certificate (NOC)',
    category: 'education',
    dataType: 'select',
    aliases: [
      'no objection certificate',
      'no objection',
      'noc',
      'university will be able to provide an no objection certificate',
      'are your university will be able to provide an no objection certificate',
      'are your university will be able to provide an',
      'college noc',
      'noc from university',
      'noc from college',
      'approval letter or no objection certificate',
      'university approval letter',
    ],
    sensitive: false,
  },
};
