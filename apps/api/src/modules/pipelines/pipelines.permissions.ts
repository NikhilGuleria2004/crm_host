export const PIPELINE_PERMISSIONS = {
  read: 'pipelines.read',
  create: 'pipelines.create',
  update: 'pipelines.update',
  delete: 'pipelines.delete',
} as const;

export type PipelinePermission = typeof PIPELINE_PERMISSIONS[keyof typeof PIPELINE_PERMISSIONS];
