import { ObjectId } from 'mongodb';
import { ReportsRepository } from './reports.repository';
import { collections } from '../../db/collections';
import { createQueue } from '../../queue/factory';
import type { SalesReportResponse, LeadConversionReportResponse, ActivityReportResponse, PipelineReportResponse, ReportExportJobResponse } from './reports.types';

export class ReportsService {
  constructor(private repository: ReportsRepository) {}

  async getSalesReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string; pipelineId?: string }): Promise<SalesReportResponse> {
    return this.repository.getSalesReport(organizationId, params);
  }

  async getPipelineReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<PipelineReportResponse[]> {
    return this.repository.getPipelineReport(organizationId, params);
  }

  async getLeadsReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<LeadConversionReportResponse[]> {
    return this.repository.getLeadsReport(organizationId, params);
  }

  async getActivityReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string }): Promise<ActivityReportResponse[]> {
    return this.repository.getActivityReport(organizationId, params);
  }

  async createSalesExportJob(organizationId: string, userId: string, params: { from?: Date; to?: Date; ownerId?: string; pipelineId?: string }, requestId?: string): Promise<ReportExportJobResponse> {
    const doc = await collections.reportJobs().insertOne({
      _id: new ObjectId(),
      organizationId: new ObjectId(organizationId),
      type: 'sales',
      params: {
        from: params.from?.toISOString(),
        to: params.to?.toISOString(),
        ownerId: params.ownerId,
        pipelineId: params.pipelineId,
      },
      status: 'pending',
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
    });

    const jobId = doc.insertedId.toHexString();

    await createQueue().enqueue({
      version: 1,
      type: 'report',
      payload: {
        jobId,
        organizationId,
        reportType: 'sales',
        params: {
          from: params.from?.toISOString(),
          to: params.to?.toISOString(),
          ownerId: params.ownerId,
          pipelineId: params.pipelineId,
        },
        requestId,
      },
    });

    const created = await collections.reportJobs().findOne({ _id: doc.insertedId });
    if (!created) throw new Error('Report job not found after creation');
    return this.toJobResponse(created);
  }

  async getExportJob(id: string, organizationId: string): Promise<ReportExportJobResponse | null> {
    try {
      const doc = await collections.reportJobs().findOne({
        _id: new ObjectId(id),
        organizationId: new ObjectId(organizationId),
      });
      if (!doc) return null;
      return this.toJobResponse(doc);
    } catch {
      return null;
    }
  }

  private toJobResponse(doc: { _id: ObjectId; type: string; status: string; fileKey?: string; createdAt: Date; completedAt?: Date }): ReportExportJobResponse {
    return {
      id: doc._id.toHexString(),
      type: doc.type,
      status: doc.status as ReportExportJobResponse['status'],
      fileKey: doc.fileKey,
      createdAt: doc.createdAt.toISOString(),
      completedAt: doc.completedAt?.toISOString(),
    };
  }
}
