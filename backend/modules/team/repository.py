from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.organization.model import Organization, OrganizationMembership
from modules.team.model import Team, TeamMembership
from modules.team.schema import TeamCreate, TeamMembershipStatus, TeamUpdate


class TeamRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_team(
        self, data: TeamCreate, created_by: str, organization_id: str
    ) -> Team:
        team = Team(
            organization_id=organization_id,
            created_by=created_by,
            name=data.name,
            slug=data.slug,
            team_metadata=data.team_metadata,
        )
        self.db.add(team)
        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def get_team_by_id(self, organization_id: str, team_id: str) -> Team | None:
        return await self.db.scalar(
            select(Team).where(
                Team.organization_id == organization_id, Team.team_id == team_id
            )
        )

    async def get_team_by_slug(self, slug: str, organization_id: str) -> Team | None:
        return await self.db.scalar(
            select(Team).where(
                Team.slug == slug, Team.organization_id == organization_id
            )
        )

    async def get_organization_by_id(self, organization_id: str) -> Organization | None:
        return await self.db.get(Organization, organization_id)

    async def get_organization_member(
        self, user_id: str, organization_id: str
    ) -> OrganizationMembership | None:
        return await self.db.get(OrganizationMembership, (user_id, organization_id))

    async def update_team(
        self, organization_id: str, team_id: str, data: TeamUpdate
    ) -> Team | None:
        team = await self.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if "team_metadata" in update_data:
            team.team_metadata = {
                **(team.team_metadata or {}),
                **(update_data.pop("team_metadata") or {}),
            }

        for field, value in update_data.items():
            setattr(team, field, value)

        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def delete_team(self, organization_id: str, team_id: str) -> bool:
        team = await self.get_team_by_id(
            organization_id=organization_id, team_id=team_id
        )
        if not team:
            return False

        await self.db.delete(team)
        await self.db.commit()
        return True

    async def add_member(
        self,
        user_id: str,
        team_id: str,
        status: TeamMembershipStatus = TeamMembershipStatus.ACTIVE,
    ) -> TeamMembership:
        membership = TeamMembership(user_id=user_id, team_id=team_id, status=status)
        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def remove_member(self, user_id: str, team_id: str) -> bool:
        membership = await self.get_member(user_id=user_id, team_id=team_id)
        if not membership:
            return False

        await self.db.delete(membership)
        await self.db.commit()
        return True

    async def get_member(self, user_id: str, team_id: str) -> TeamMembership | None:
        return await self.db.get(TeamMembership, (user_id, team_id))

    async def get_members(self, team_id: str) -> list[TeamMembership]:
        result = await self.db.scalars(
            select(TeamMembership).where(TeamMembership.team_id == team_id)
        )
        return list(result.all())

    async def get_user_teams_in_org(
        self, user_id: str, organization_id: str
    ) -> list[Team]:
        result = await self.db.scalars(
            select(Team)
            .join(TeamMembership, TeamMembership.team_id == Team.team_id)
            .where(
                TeamMembership.user_id == user_id,
                Team.organization_id == organization_id,
            )
        )
        return list(result.all())
