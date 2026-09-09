from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from modules.organization.exceptions import NotOrganizationMember, OrganizationNotFound
from modules.team.exception import (
    NotTeamMember,
    TeamAccessDenied,
    TeamMemberAlreadyExists,
    TeamNotFound,
    TeamSlugAlreadyExists,
)
from modules.team.model import Team, TeamMembership
from modules.team.repository import TeamRepository
from modules.team.schema import (
    AddTeamMemberRequest,
    TeamCreate,
    TeamMembershipStatus,
    TeamUpdate,
)
from shared.db.dependencies import get_db


class TeamService:
    def __init__(self, repo: TeamRepository) -> None:
        self.repo = repo

    async def create_team(
        self, data: TeamCreate, organization_id: str, user_id: str
    ) -> Team:
        await self._ensure_organization_owner(
            organization_id=organization_id,
            user_id=user_id,
        )
        existing = await self.repo.get_team_by_slug(data.slug, organization_id)
        if existing:
            raise TeamSlugAlreadyExists("Team slug already exists")

        team = await self.repo.create_team(data, user_id, organization_id)
        await self.repo.add_member(
            user_id=user_id,
            team_id=team.team_id,
            status=TeamMembershipStatus.ACTIVE,
        )
        return team

    async def get_team_by_id(
        self, organization_id: str, team_id: str, user_id: str
    ) -> Team:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_member(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        return team

    async def update_team(
        self, organization_id: str, team_id: str, data: TeamUpdate, user_id: str
    ) -> Team:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_owner(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        if data.slug and data.slug != team.slug:
            existing = await self.repo.get_team_by_slug(data.slug, team.organization_id)
            if existing and existing.team_id != team_id:
                raise TeamSlugAlreadyExists("Team slug already exists")

        updated = await self.repo.update_team(organization_id, team_id, data)
        if not updated:
            raise TeamNotFound("Team not found")
        return updated

    async def delete_team(
        self, organization_id: str, team_id: str, user_id: str
    ) -> None:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_owner(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        deleted = await self.repo.delete_team(
            organization_id=organization_id, team_id=team_id
        )
        if not deleted:
            raise TeamNotFound("Team not found")

    async def add_member(
        self,
        organization_id: str,
        team_id: str,
        data: AddTeamMemberRequest,
        user_id: str,
    ) -> TeamMembership:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_owner(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        await self._ensure_organization_member(
            organization_id=team.organization_id,
            user_id=data.user_id,
        )

        existing = await self.repo.get_member(user_id=data.user_id, team_id=team_id)
        if existing:
            raise TeamMemberAlreadyExists("User is already a team member")

        return await self.repo.add_member(
            user_id=data.user_id,
            team_id=team_id,
            status=data.status,
        )

    async def remove_member(
        self, organization_id: str, team_id: str, member_user_id: str, user_id: str
    ) -> None:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_owner(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        removed = await self.repo.remove_member(
            user_id=member_user_id,
            team_id=team_id,
        )
        if not removed:
            raise NotTeamMember("User is not a team member")

    async def get_members(
        self, organization_id: str, team_id: str, user_id: str
    ) -> list[TeamMembership]:
        team = await self.repo.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            raise TeamNotFound("Team not found")

        await self._ensure_organization_member(
            organization_id=team.organization_id,
            user_id=user_id,
        )
        return await self.repo.get_members(team_id)

    async def get_user_teams_in_org(
        self, organization_id: str, user_id: str
    ) -> list[Team]:
        return await self.repo.get_user_teams_in_org(
            user_id=user_id, organization_id=organization_id
        )

    async def _ensure_organization_member(
        self, organization_id: str, user_id: str
    ) -> None:
        organization = await self.repo.get_organization_by_id(organization_id)
        if not organization:
            raise OrganizationNotFound("Organization not found")

        membership = await self.repo.get_organization_member(
            user_id=user_id,
            organization_id=organization_id,
        )
        if not membership:
            raise NotOrganizationMember("User is not a member of this organization")

    async def _ensure_organization_owner(
        self, organization_id: str, user_id: str
    ) -> None:
        organization = await self.repo.get_organization_by_id(organization_id)
        if not organization:
            raise OrganizationNotFound("Organization not found")

        if organization.created_by != user_id:
            raise TeamAccessDenied("Only the organization owner can manage teams")


async def get_team_service(db: AsyncSession = Depends(get_db)) -> TeamService:
    return TeamService(repo=TeamRepository(db=db))
