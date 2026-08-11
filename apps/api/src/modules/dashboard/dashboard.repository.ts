import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';

export class DashboardRepository {
  async getSummary(organizationId: string): Promise<{
    pipelineValue: number;
    openDeals: number;
    wonRevenue: number;
    lostRevenue: number;
    winRate: number;
    newLeads: number;
    qualifiedLeads: number;
    overdueTasks: number;
  }> {
    const orgId = new ObjectId(organizationId);

    const [
      openDealsResult,
      wonRevenueResult,
      lostRevenueResult,
      newLeadsResult,
      qualifiedLeadsResult,
      overdueTasksResult,
    ] = await Promise.all([
      collections.deals().countDocuments({
        organizationId: orgId,
        status: 'open',
        deletedAt: { $exists: false },
      }),
      collections.deals().aggregate([
        {
          $match: {
            organizationId: orgId,
            status: 'won',
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]).toArray(),
      collections.deals().aggregate([
        {
          $match: {
            organizationId: orgId,
            status: 'lost',
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]).toArray(),
      collections.leads().countDocuments({
        organizationId: orgId,
        status: 'new',
        deletedAt: { $exists: false },
      }),
      collections.leads().countDocuments({
        organizationId: orgId,
        status: 'qualified',
        deletedAt: { $exists: false },
      }),
      collections.tasks().countDocuments({
        organizationId: orgId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: new Date() },
        deletedAt: { $exists: false },
      }),
    ]);

    const wonRevenue = wonRevenueResult.length > 0 ? wonRevenueResult[0].total || 0 : 0;
    const lostRevenue = lostRevenueResult.length > 0 ? lostRevenueResult[0].total || 0 : 0;
    const totalClosed = wonRevenue + lostRevenue;
    
    let winRate = 0;
    if (totalClosed > 0) {
      winRate = Math.round((wonRevenue / totalClosed) * 1000) / 10;
    }

    const pipelineValueResult = await collections.deals().aggregate([
      {
        $match: {
          organizationId: orgId,
          status: 'open',
          deletedAt: { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const pipelineValue = pipelineValueResult.length > 0 ? pipelineValueResult[0].total || 0 : 0;

    return {
      pipelineValue,
      openDeals: openDealsResult,
      wonRevenue,
      lostRevenue,
      winRate,
      newLeads: newLeadsResult,
      qualifiedLeads: qualifiedLeadsResult,
      overdueTasks: overdueTasksResult,
    };
  }

  async getPipeline(organizationId: string): Promise<{
    stageId: string;
    stageName: string;
    dealCount: number;
    totalValue: number;
  }[]> {
    const orgId = new ObjectId(organizationId);

    const pipelineStages = await collections.pipelineStages()
      .find({ organizationId: orgId })
      .sort({ order: 1 })
      .toArray();

    if (pipelineStages.length === 0) {
      return [];
    }

    const stageIds = pipelineStages.map((s) => s._id);

    const dealsByStage = await collections.deals().aggregate([
      {
        $match: {
          organizationId: orgId,
          stageId: { $in: stageIds },
          deletedAt: { $exists: false },
        },
      },
      {
        $group: {
          _id: '$stageId',
          dealCount: { $sum: 1 },
          totalValue: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const dealMap = new Map<string, { dealCount: number; totalValue: number }>();
    for (const stage of dealsByStage) {
      dealMap.set(stage._id.toHexString(), {
        dealCount: stage.dealCount,
        totalValue: stage.totalValue || 0,
      });
    }

    return pipelineStages.map((stage) => {
      const stats = dealMap.get(stage._id.toHexString()) || { dealCount: 0, totalValue: 0 };
      return {
        stageId: stage._id.toHexString(),
        stageName: (stage as any).name,
        dealCount: stats.dealCount,
        totalValue: stats.totalValue,
      };
    });
  }
}
