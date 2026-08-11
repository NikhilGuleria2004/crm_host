export { createDealsRoutes } from './deals.routes';
export { DealService } from './deals.service';
export { DealRepository } from './deals.repository';
export { DEAL_PERMISSIONS } from './deals.permissions';
export type {
  DealResponse,
  DealDetailResponse,
  CreateDealInput,
  UpdateDealInput,
  DealListParams,
  DealListResponse,
  DealListQuery,
  ChangeStageInput,
  MarkWonInput,
  MarkLostInput,
  DealStageInfo,
} from './deals.types';
