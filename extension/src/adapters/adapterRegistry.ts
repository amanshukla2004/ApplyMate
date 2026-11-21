import { FormAdapter } from './FormAdapter';
import { GenericAdapter } from './generic/GenericAdapter';
import { GreenhouseAdapter } from './greenhouse/GreenhouseAdapter';
import { LeverAdapter } from './lever/LeverAdapter';
import { WorkdayAdapter } from './workday/WorkdayAdapter';
import { LinkedInAdapter } from './linkedin/LinkedInAdapter';
import { GoogleFormsAdapter } from './google/GoogleFormsAdapter';
import { AshbyAdapter } from './ashby/AshbyAdapter';

export class AdapterRegistry {
  private adapters: FormAdapter[] = [
    new GoogleFormsAdapter(),
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new AshbyAdapter(),
    new WorkdayAdapter(),
    new LinkedInAdapter(),
  ];

  private fallback = new GenericAdapter();

  getActiveAdapter(url: string = window.location.href, doc: Document = document): FormAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isSupported(url, doc)) {
        return adapter;
      }
    }
    return this.fallback;
  }
}

export const adapterRegistry = new AdapterRegistry();
