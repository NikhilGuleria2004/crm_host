import type { EntityFilterDefinition } from './filters.types';

export const CONTACT_FILTERS: EntityFilterDefinition = {
  fields: {
    status: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
    ownerId: { type: 'text', operators: ['eq'] },
    companyId: { type: 'text', operators: ['eq'] },
    source: { type: 'text', operators: ['eq', 'contains'] },
    tagId: { type: 'text', operators: ['eq'] },
    firstName: { type: 'text', operators: ['eq', 'contains', 'startsWith', 'endsWith'] },
    lastName: { type: 'text', operators: ['eq', 'contains', 'startsWith', 'endsWith'] },
    email: { type: 'text', operators: ['eq', 'contains', 'startsWith', 'endsWith'] },
    phone: { type: 'text', operators: ['eq', 'contains'] },
    jobTitle: { type: 'text', operators: ['eq', 'contains'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'status'],
  defaultSort: 'createdAt',
  searchFields: ['firstName', 'lastName', 'email', 'phone'],
};

export const COMPANY_FILTERS: EntityFilterDefinition = {
  fields: {
    status: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
    ownerId: { type: 'text', operators: ['eq'] },
    name: { type: 'text', operators: ['eq', 'contains', 'startsWith', 'endsWith'] },
    industry: { type: 'text', operators: ['eq', 'contains'] },
    website: { type: 'text', operators: ['eq', 'contains'] },
    email: { type: 'text', operators: ['eq', 'contains'] },
    phone: { type: 'text', operators: ['eq', 'contains'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'name', 'industry'],
  defaultSort: 'createdAt',
  searchFields: ['name', 'normalizedName', 'email', 'phone', 'industry'],
};

export const DEAL_FILTERS: EntityFilterDefinition = {
  fields: {
    status: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'open', label: 'Open' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
    ]},
    pipelineId: { type: 'text', operators: ['eq'] },
    stageId: { type: 'text', operators: ['eq'] },
    ownerId: { type: 'text', operators: ['eq'] },
    companyId: { type: 'text', operators: ['eq'] },
    contactId: { type: 'text', operators: ['eq'] },
    amount: { type: 'number', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
    probability: { type: 'number', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
    currency: { type: 'select', operators: ['eq'], options: [
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
      { value: 'INR', label: 'INR' },
    ]},
    source: { type: 'text', operators: ['eq', 'contains'] },
    expectedCloseDate: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'name', 'amount', 'probability', 'expectedCloseDate'],
  defaultSort: 'createdAt',
  searchFields: ['name', 'source'],
};

export const TASK_FILTERS: EntityFilterDefinition = {
  fields: {
    status: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    priority: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ]},
    assignedTo: { type: 'text', operators: ['eq'] },
    contactId: { type: 'text', operators: ['eq'] },
    companyId: { type: 'text', operators: ['eq'] },
    dealId: { type: 'text', operators: ['eq'] },
    leadId: { type: 'text', operators: ['eq'] },
    dueDate: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'],
  defaultSort: 'createdAt',
  searchFields: ['title', 'description'],
};

export const LEAD_FILTERS: EntityFilterDefinition = {
  fields: {
    status: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'new', label: 'New' },
      { value: 'contacted', label: 'Contacted' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'unqualified', label: 'Unqualified' },
      { value: 'converted', label: 'Converted' },
    ]},
    source: { type: 'text', operators: ['eq', 'contains'] },
    ownerId: { type: 'text', operators: ['eq'] },
    score: { type: 'number', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'score', 'status'],
  defaultSort: 'createdAt',
  searchFields: ['firstName', 'lastName', 'email', 'companyName', 'phone'],
};

export const ACTIVITY_FILTERS: EntityFilterDefinition = {
  fields: {
    type: { type: 'select', operators: ['eq', 'ne'], options: [
      { value: 'call', label: 'Call' },
      { value: 'email', label: 'Email' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'demo', label: 'Demo' },
      { value: 'follow_up', label: 'Follow Up' },
      { value: 'note', label: 'Note' },
      { value: 'other', label: 'Other' },
    ]},
    ownerId: { type: 'text', operators: ['eq'] },
    contactId: { type: 'text', operators: ['eq'] },
    companyId: { type: 'text', operators: ['eq'] },
    leadId: { type: 'text', operators: ['eq'] },
    dealId: { type: 'text', operators: ['eq'] },
    occurredAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'occurredAt', 'subject', 'type'],
  defaultSort: 'createdAt',
  searchFields: ['subject', 'description'],
};

export const NOTE_FILTERS: EntityFilterDefinition = {
  fields: {
    contactId: { type: 'text', operators: ['eq'] },
    companyId: { type: 'text', operators: ['eq'] },
    leadId: { type: 'text', operators: ['eq'] },
    dealId: { type: 'text', operators: ['eq'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'title'],
  defaultSort: 'createdAt',
  searchFields: ['title', 'body'],
};

export const PIPELINE_FILTERS: EntityFilterDefinition = {
  fields: {
    name: { type: 'text', operators: ['eq', 'contains', 'startsWith'] },
    isDefault: { type: 'boolean', operators: ['eq'] },
    createdAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    updatedAt: { type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  },
  sortFields: ['createdAt', 'updatedAt', 'name'],
  defaultSort: 'createdAt',
  searchFields: ['name', 'description'],
};
