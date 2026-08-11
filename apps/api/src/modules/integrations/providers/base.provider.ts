export interface IntegrationProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sync(): Promise<void>;
  handleWebhook(payload: unknown): Promise<void>;
}

export const PROVIDERS = {
  google: 'google',
  microsoft: 'microsoft',
  slack: 'slack',
  teams: 'teams',
  accounting: 'accounting',
  marketing: 'marketing',
  telephony: 'telephony',
} as const;

export type ProviderKey = typeof PROVIDERS[keyof typeof PROVIDERS];
