export interface OrganizationSettings {
  dateFormat: string;
  fiscalYearStartMonth: number;
  defaultPipelineId?: string;
  features?: {
    automation?: boolean;
    integrations?: boolean;
    apiAccess?: boolean;
  };
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  locale: string;
  settings: OrganizationSettings;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  timezone: string;
  currency: string;
  locale: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  timezone?: string;
  currency?: string;
  locale?: string;
  status?: 'active' | 'suspended';
}
