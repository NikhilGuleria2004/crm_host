import { TeamRepository } from './teams.repository';
import type { CreateTeamInput, UpdateTeamInput, TeamResponse } from './teams.types';

export class TeamService {
  constructor(private repository: TeamRepository) {}

  async create(organizationId: string, input: CreateTeamInput): Promise<TeamResponse> {
    const team = await this.repository.create({ ...input, organizationId });
    return this.repository.toResponse(team) as TeamResponse;
  }

  async getById(id: string, organizationId: string): Promise<TeamResponse | null> {
    const team = await this.repository.findById(id, organizationId);
    return this.repository.toResponse(team) as TeamResponse | null;
  }

  async listByOrganization(organizationId: string): Promise<TeamResponse[]> {
    const teams = await this.repository.findByOrganization(organizationId);
    return teams.map((team) => this.repository.toResponse(team) as TeamResponse);
  }

  async update(id: string, organizationId: string, input: UpdateTeamInput): Promise<TeamResponse | null> {
    const team = await this.repository.update(id, organizationId, input);
    return this.repository.toResponse(team) as TeamResponse | null;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete(id, organizationId);
  }
}
