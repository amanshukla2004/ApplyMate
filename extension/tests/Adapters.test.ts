import { describe, it, expect } from 'vitest';
import { adapterRegistry } from '../src/adapters/adapterRegistry';

describe('AdapterRegistry', () => {
  it('detects Greenhouse adapter on boards.greenhouse.io', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://boards.greenhouse.io/company/jobs/123', document);
    expect(adapter.name).toBe('Greenhouse Job Board');
  });

  it('detects Lever adapter on jobs.lever.co', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://jobs.lever.co/company/abc', document);
    expect(adapter.name).toBe('Lever Application Form');
  });

  it('detects Workday adapter on myworkdayjobs.com', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://company.myworkdayjobs.com/en-US/careers/job/123', document);
    expect(adapter.name).toBe('Workday Career Portal');
  });

  it('detects LinkedIn adapter on linkedin.com/jobs', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://www.linkedin.com/jobs/view/9999', document);
    expect(adapter.name).toBe('LinkedIn Easy Apply');
  });

  it('falls back to Generic Web Form for unlisted portal domains', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://startup.io/careers/apply', document);
    expect(adapter.name).toBe('Generic Web Form');
  });
});
