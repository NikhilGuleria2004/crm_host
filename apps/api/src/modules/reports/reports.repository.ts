import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';

export class ReportsRepository {
  async getSalesReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string; pipelineId?: string }): Promise<{
    revenue: number;
    wonDeals: number;
    lostDeals: number;
    averageDealSize: number;
    winRate: number;
  }> {
    const orgId = new ObjectId(organizationId);

    const match: Record<string, unknown> = {
      organizationId: orgId,
      status: { $in: ['won', 'lost'] },
      deletedAt: { $exists: false },
    };

    if (params.from || params.to) {
      (match as any).createdAt = {};
      if (params.from) (match as any).createdAt.$gte = params.from;
      if (params.to) (match as any).createdAt.$lte = params.to;
    }

    if (params.ownerId) {
      match.ownerId = new ObjectId(params.ownerId);
    }

    if (params.pipelineId) {
      match.pipelineId = new ObjectId(params.pipelineId);
    }

    const result = await collections.deals().aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    let wonDeals = 0;
    let lostDeals = 0;
    let revenue = 0;

    for (const row of result) {
      if (row._id === 'won') {
        wonDeals = row.count;
        revenue = row.total;
      } else if (row._id === 'lost') {
        lostDeals = row.count;
      }
    }

    const totalClosed = wonDeals + lostDeals;
    const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 1000) / 10 : 0;
    const averageDealSize = wonDeals > 0 ? Math.round(revenue / wonDeals) : 0;

    return {
      revenue,
      wonDeals,
      lostDeals,
      averageDealSize,
      winRate,
    };
  }

  async getPipelineReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<{
    stageId: string;
    stageName: string;
    dealCount: number;
    dealValue: number;
  }[]> {
    const orgId = new ObjectId(organizationId);

    const match: Record<string, unknown> = {
      organizationId: orgId,
      status: 'open',
      deletedAt: { $exists: false },
    };

    if (params.from || params.to) {
      (match as any).createdAt = {};
      if (params.from) (match as any).createdAt.$gte = params.from;
      if (params.to) (match as any).createdAt.$lte = params.to;
    }

    const stages = await collections.pipelineStages()
      .find({ organizationId: orgId })
      .sort({ order: 1 })
      .toArray();

    if (stages.length === 0) {
      return [];
    }

    const stageIds = stages.map((s) => s._id);

    const dealsByStage = await collections.deals().aggregate([
      { $match: { ...match, stageId: { $in: stageIds } } },
      {
        $group: {
          _id: '$stageId',
          dealCount: { $sum: 1 },
          dealValue: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const dealMap = new Map<string, { dealCount: number; dealValue: number }>();
    for (const row of dealsByStage) {
      dealMap.set(row._id.toHexString(), {
        dealCount: row.dealCount,
        dealValue: row.dealValue || 0,
      });
    }

    return stages.map((stage) => {
      const stats = dealMap.get(stage._id.toHexString()) || { dealCount: 0, dealValue: 0 };
      return {
        stageId: stage._id.toHexString(),
        stageName: (stage as any).name,
        dealCount: stats.dealCount,
        dealValue: stats.dealValue,
      };
    });
  }

  async getLeadsReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<{
    source: string;
    leads: number;
    qualified: number;
    converted: number;
    conversionRate: number;
  }[]> {
    const orgId = new ObjectId(organizationId);

    const match: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: { $exists: false },
    };

    if (params.from || params.to) {
      (match as any).createdAt = {};
      if (params.from) (match as any).createdAt.$gte = params.from;
      if (params.to) (match as any).createdAt.$lte = params.to;
    }

    const result = await collections.leads().aggregate([
      { $match: match },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          qualified: {
            $sum: {
              $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0],
            },
          },
          converted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'converted'] }, 1, 0],
            },
          },
        },
      },
    ]).toArray();

    return result.map((row) => ({
      source: row._id || 'Unknown',
      leads: row.total,
      qualified: row.qualified,
      converted: row.converted,
      conversionRate: row.total > 0 ? Math.round((row.converted / row.total) * 1000) / 10 : 0,
    }));
  }

  async getActivityReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string }): Promise<{
    userId: string;
    userName: string;
    calls: number;
    emails: number;
    meetings: number;
    tasks: number;
  }[]> {
    const orgId = new ObjectId(organizationId);

    const match: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: { $exists: false },
    };

    if (params.from || params.to) {
      (match as any).occurredAt = {};
      if (params.from) (match as any).occurredAt.$gte = params.from;
      if (params.to) (match as any).occurredAt.$lte = params.to;
    }

    if (params.ownerId) {
      match.ownerId = new ObjectId(params.ownerId);
    }

    const result = await collections.activities().aggregate([
      { $match: match },
      {
        $group: {
          _id: '$ownerId',
          calls: {
            $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] },
          },
          emails: {
            $sum: { $cond: [{ $eq: ['$type', 'email'] }, 1, 0] },
          },
          meetings: {
            $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, 1, 0] },
          },
          tasks: {
            $sum: { $cond: [{ $eq: ['$type', 'task'] }, 1, 0] },
          },
        },
      },
    ]).toArray();

    const userIds = result.map((r) => new ObjectId(r._id));
    const users = await collections.users()
      .find({ _id: { $in: userIds } })
      .toArray();

    const userMap = new Map<string, string>();
    for (const user of users) {
      userMap.set(user._id.toHexString(), `${user.firstName} ${user.lastName || ''}`.trim());
    }

    return result.map((row) => ({
      userId: row._id.toHexString(),
      userName: userMap.get(row._id.toHexString()) || 'Unknown',
      calls: row.calls,
      emails: row.emails,
      meetings: row.meetings,
      tasks: row.tasks,
    }));
  }
}
