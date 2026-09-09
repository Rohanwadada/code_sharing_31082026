from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.time import get_current_timestamp
from modules.roadmap.model import Roadmap
from modules.roadmap.schema import RoadmapCreate, RoadmapUpdate


class RoadmapRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: RoadmapCreate, user_id: str) -> Roadmap:
        roadmap = Roadmap(
            user_id=user_id,
            organization_id=data.organization_id,
            team_id=data.team_id,
            title=data.title,
            description=data.description,
            roadmap_graph=data.roadmap_graph,
            roadmap_content=data.roadmap_content,
            level=data.level,
            visibility_scope=data.visibility_scope,
            price={
                "previous_prices": [],
                "current_price": {
                    "value": data.price,
                    "effective_from": str(get_current_timestamp()),
                },
            },
            project_id=data.project_id
        )
        self.db.add(roadmap)
        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap

    async def get_by_id(self, roadmap_id: str) -> Roadmap | None:
        return await self.db.get(Roadmap, roadmap_id)

    async def get_by_organization(self, organization_id: str) -> list[Roadmap]:
        result = await self.db.scalars(
            select(Roadmap).where(Roadmap.organization_id == organization_id)
        )
        return list(result.all())

    async def update(self, roadmap_id: str, data: RoadmapUpdate) -> Roadmap | None:
        roadmap = await self.get_by_id(roadmap_id)
        if not roadmap:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if "roadmap_graph" in update_data:
            roadmap.roadmap_graph = {
                **(roadmap.roadmap_graph or {}),
                **(update_data.pop("roadmap_graph") or {}),
            }
            flag_modified(roadmap, "roadmap_graph")

        if "roadmap_content" in update_data:
            roadmap.roadmap_content = {
                **(roadmap.roadmap_content or {}),
                **(update_data.pop("roadmap_content") or {}),
            }
            flag_modified(roadmap, "roadmap_content")

        updated_roadmap_metadata = roadmap.roadmap_metadata

        if (
            updated_roadmap_metadata.get("mode", "manual") == "ai-generated"
            and data.source == "canvas"
        ):
            updated_roadmap_metadata["has_manual_edits"] = True

            roadmap.roadmap_metadata = updated_roadmap_metadata
            flag_modified(roadmap, "roadmap_metadata")

        for field, value in update_data.items():
            setattr(roadmap, field, value)

        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap

    async def delete(self, roadmap_id: str) -> bool:
        roadmap = await self.get_by_id(roadmap_id)
        if not roadmap:
            return False
        await self.db.delete(roadmap)
        await self.db.commit()
        return True
