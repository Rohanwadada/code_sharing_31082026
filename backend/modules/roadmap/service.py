import copy

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.exception import ForbiddenException
from core.security.hashing import generate_hash
from core.security.random import securerandomstring
from modules.organization.service import OrganizationService, get_organization_service
from modules.roadmap.exceptions import RoadmapNotFound
from modules.roadmap.model import Roadmap
from modules.roadmap.repository import RoadmapRepository
from modules.roadmap.roadmap_access_service import (
    RoadmapAccessService,
    get_roadmap_access_service,
)
from modules.roadmap.schema import (
    RoadmapClone,
    RoadmapCreate,
    RoadmapLevel,
    RoadmapUpdate,
)
from modules.team.service import TeamService, get_team_service
from shared.db.dependencies import get_db


class RoadmapService:
    def __init__(
        self,
        repo: RoadmapRepository,
        organization_service: OrganizationService,
        team_service: TeamService,
        roadmap_access_service: RoadmapAccessService,
    ) -> None:
        self.repo = repo
        self.organization_service = organization_service
        self.team_service = team_service
        self.roadmap_access_service = roadmap_access_service

    async def create(self, data: RoadmapCreate, user_id: str) -> Roadmap:
        await self.organization_service.get_organization_by_id(
            organization_id=data.organization_id
        )

        if data.team_id:
            await self.team_service.get_team_by_id(
                team_id=data.team_id,
                organization_id=data.organization_id,
                user_id=user_id,
            )

        roadmap_graph, roadmap_content = self.regenerate_roadmap(
            user_id=user_id,
            organization_id=data.organization_id,
            roadmap_graph=self.get_starter_roadmap(),
            roadmap_content={},
        )

        data.roadmap_graph, data.roadmap_content = roadmap_graph, roadmap_content

        roadmap = await self.repo.create(data=data, user_id=user_id)
        await self.roadmap_access_service.add_or_update_roadmap_access(
            user_id=user_id,
            granting_user_id=user_id,
            roadmap_id=roadmap.roadmap_id,
            role="owner",
            sharing_mode="owner_sharing",
        )
        return roadmap

    async def clone_roadmap(self, data: RoadmapClone, user_id: str) -> Roadmap:
        await self.organization_service.get_organization_by_id(
            organization_id=data.organization_id
        )

        if data.team_id:
            await self.team_service.get_team_by_id(
                team_id=data.team_id,
                organization_id=data.organization_id,
                user_id=user_id,
            )

        roadmap_graph, roadmap_content = {}, {}
        parent_roadmap = await self.repo.get_by_id(data.ref_rid)
        if parent_roadmap:
            clone_type = data.cln_t
            print(clone_type)

            if clone_type == "all":
                roadmap_graph, roadmap_content = self.regenerate_roadmap(
                    user_id=user_id,
                    organization_id=data.organization_id,
                    roadmap_graph=parent_roadmap.roadmap_graph,
                    roadmap_content=parent_roadmap.roadmap_content,
                )
            else:
                roadmap_graph, roadmap_content = self.regenerate_roadmap(
                    user_id=user_id,
                    organization_id=data.organization_id,
                    roadmap_graph=parent_roadmap.roadmap_graph,
                    roadmap_content={},
                )

            data.roadmap_graph = {
                **roadmap_graph,
                "ref_rid": data.ref_rid,
                "clone_type": clone_type,
            }
            data.roadmap_content = roadmap_content
            data.title = f"{data.title}-Copy"
            roadmap_graph["clone_type"] = clone_type
            data.level = RoadmapLevel(parent_roadmap.level)
            data.price = parent_roadmap.price["current_price"]["value"]

        roadmap = await self.repo.create(data=data, user_id=user_id)

        await self.roadmap_access_service.add_or_update_roadmap_access(
            user_id=user_id,
            granting_user_id=user_id,
            roadmap_id=roadmap.roadmap_id,
            role="owner",
            sharing_mode="owner_sharing",
        )
        return roadmap

    async def get_by_id(self, roadmap_id: str) -> Roadmap:
        roadmap = await self.repo.get_by_id(roadmap_id)
        if not roadmap:
            raise RoadmapNotFound("Roadmap not found")
        return roadmap

    async def get_roadmap_details(self, user_id: str, roadmap_id: str) -> dict:
        return await self.roadmap_access_service.get_roadmap_by_id(
            user_id=user_id, roadmap_id=roadmap_id
        )

    async def get_by_organization(self, organization_id: str) -> list[Roadmap]:
        return await self.repo.get_by_organization(organization_id)

    async def update(
        self, roadmap_id: str, user_id: str, data: RoadmapUpdate
    ) -> Roadmap:
        user_roadmap_data = await self.roadmap_access_service.get_roadmap_by_id(
            user_id=user_id, roadmap_id=roadmap_id
        )

        if user_roadmap_data.get("access", None) not in ["owner", "editor"]:
            raise ForbiddenException("Access denied")

        roadmap = await self.repo.update(roadmap_id, data)
        if not roadmap:
            raise RoadmapNotFound("Roadmap not found")
        return roadmap

    async def delete(self, roadmap_id: str) -> None:
        deleted = await self.repo.delete(roadmap_id)
        if not deleted:
            raise RoadmapNotFound("Roadmap not found")

    def get_starter_roadmap(self) -> dict:
        return {
            "edges": [
                {
                    "id": "edge__AEa8e572d056dc81Aef4b4a32a5Aa879",
                    "type": "step",
                    "style": {
                        "stroke": "#000000",
                        "strokeWidth": 2,
                        "strokeDasharray": "5 5",
                    },
                    "source": "677e699868Be19f590D821E691D46907",
                    "target": "2d5A994ed8A019D627b2d19cB81e065a",
                    "selected": False,
                    "sourceHandle": "r1",
                    "targetHandle": "l2",
                },
                {
                    "id": "edge__f0debe9F98D94DDCe6536289147Fcdf6",
                    "type": "step",
                    "style": {
                        "stroke": "#000000",
                        "strokeWidth": 2,
                        "strokeDasharray": "5 5",
                    },
                    "source": "677e699868Be19f590D821E691D46907",
                    "target": "74a1fa9737c50A5DF137193741Ff8C5E",
                    "selected": False,
                    "sourceHandle": "r1",
                    "targetHandle": "l2",
                },
            ],
            "nodes": [
                {
                    "id": "677e699868Be19f590D821E691D46907",
                    "data": {
                        "label": "Type Topic",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#BEBEBE",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": True,
                        "headerStyle": {
                            "color": "#ffffff",
                            "height": 74,
                            "fontSize": "28px",
                            "backgroundColor": "#1849D6",
                        },
                    },
                    "type": "topicGroup",
                    "style": {"width": 350, "height": 198},
                    "height": 198,
                    "dragging": False,
                    "measured": {"width": 350, "height": 198},
                    "position": {"x": 768.3866774570794, "y": 2},
                    "selected": False,
                    "draggable": True,
                },
                {
                    "id": "1A1f7dCe939065113c231D407f017e9b",
                    "data": {
                        "label": "Assignment",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#000000",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": False,
                    },
                    "type": "assignmentNode",
                    "style": {"width": 315},
                    "width": 315,
                    "extent": "parent",
                    "measured": {"width": 315, "height": 74},
                    "parentId": "677e699868Be19f590D821E691D46907",
                    "position": {"x": 17.5, "y": 94},
                    "selected": False,
                    "draggable": True,
                    "connectable": True,
                },
                {
                    "id": "2d5A994ed8A019D627b2d19cB81e065a",
                    "data": {
                        "label": "Heading",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#BEBEBE",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": True,
                        "headerStyle": {
                            "color": "#ffffff",
                            "height": 82,
                            "fontSize": "28px",
                            "backgroundColor": "#313030",
                        },
                    },
                    "type": "subtopicGroup",
                    "style": {"width": 350, "height": 390},
                    "height": 390,
                    "dragging": False,
                    "measured": {"width": 350, "height": 390},
                    "position": {"x": 1367, "y": -94},
                    "selected": False,
                    "draggable": True,
                },
                {
                    "id": "0546827b7756be44161d96b44BB56a50",
                    "data": {
                        "label": "Sub-Topic",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#000000",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": False,
                    },
                    "type": "subtopic",
                    "style": {"width": 315},
                    "width": 315,
                    "extent": "parent",
                    "measured": {"width": 315, "height": 74},
                    "parentId": "2d5A994ed8A019D627b2d19cB81e065a",
                    "position": {"x": 17.5, "y": 112},
                    "selected": False,
                    "draggable": True,
                    "connectable": True,
                },
                {
                    "id": "74a1fa9737c50A5DF137193741Ff8C5E",
                    "data": {
                        "label": "Heading",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#BEBEBE",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": True,
                        "headerStyle": {
                            "color": "#ffffff",
                            "height": 82,
                            "fontSize": "28px",
                            "backgroundColor": "#313030",
                        },
                    },
                    "type": "subtopicGroup",
                    "style": {"width": 350, "height": 390},
                    "height": 390,
                    "dragging": False,
                    "measured": {"width": 350, "height": 390},
                    "position": {"x": 1367, "y": 387.2847125},
                    "selected": False,
                    "draggable": True,
                },
                {
                    "id": "bD960b51FedAFdc9b2f64F60727D1f34",
                    "data": {
                        "label": "Sub-Topic",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#000000",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": False,
                    },
                    "type": "subtopic",
                    "style": {"width": 315},
                    "width": 315,
                    "extent": "parent",
                    "measured": {"width": 315, "height": 74},
                    "parentId": "74a1fa9737c50A5DF137193741Ff8C5E",
                    "position": {"x": 17.5, "y": 112},
                    "selected": False,
                    "draggable": True,
                    "connectable": True,
                },
                {
                    "id": "Ee225cBfF350E13fa018fc3dE5B912ef",
                    "data": {
                        "label": "Assignment",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#000000",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": False,
                    },
                    "type": "assignmentNode",
                    "style": {"width": 315},
                    "width": 315,
                    "extent": "parent",
                    "measured": {"width": 315, "height": 74},
                    "parentId": "2d5A994ed8A019D627b2d19cB81e065a",
                    "position": {"x": 17.5, "y": 211},
                    "selected": False,
                    "draggable": True,
                    "connectable": True,
                },
                {
                    "id": "9E92C60A8Ca6d9149e819317D6CE3Db9",
                    "data": {
                        "label": "Assignment",
                        "style": {
                            "color": "#000000",
                            "fontSize": "28px",
                            "borderColor": "#000000",
                            "backgroundColor": "#ffffff",
                        },
                        "convertible": False,
                    },
                    "type": "assignmentNode",
                    "style": {"width": 315},
                    "extent": "parent",
                    "dragging": False,
                    "measured": {"width": 315, "height": 74},
                    "parentId": "74a1fa9737c50A5DF137193741Ff8C5E",
                    "position": {"x": 17.5, "y": 211},
                    "selected": False,
                    "draggable": True,
                    "connectable": True,
                },
            ],
            "viewport": {
                "x": -359.8558282632158,
                "y": 43.57480974110945,
                "zoom": 0.8190724103378827,
            },
        }

    def regenerate_roadmap(
        self,
        user_id: str,
        organization_id: str,
        roadmap_graph: dict,
        roadmap_content: dict | None = None,
    ):
        """
        Regenerates unique node and edge IDs while keeping the roadmap structure intact.
        """
        new_roadmap_graph = copy.deepcopy(roadmap_graph)
        new_roadmap_content = {}

        old_to_new_id_map = {
            node["id"]: generate_hash(
                "#".join(
                    [user_id, organization_id, node["id"], securerandomstring(20)]
                ).encode("utf-8"),
                32,
            )
            for node in new_roadmap_graph["nodes"]
        }

        def update_roadmap_graph():
            for node in new_roadmap_graph["nodes"]:
                old_node_id = node["id"]
                new_node_id = old_to_new_id_map[old_node_id]

                node["id"] = new_node_id

                # update the parent node it if the node is a child node
                if "parentId" in node:
                    old_parent_id = node["parentId"]
                    new_parent_id = old_to_new_id_map[old_parent_id]
                    print(
                        f"Node has parent ID: Old : {old_parent_id} New :: {new_parent_id}"
                    )
                    node["parentId"] = new_parent_id

                if roadmap_content and old_node_id in roadmap_content:
                    new_roadmap_content[new_node_id] = roadmap_content[old_node_id]

            for edge in new_roadmap_graph["edges"]:
                new_edge_id = generate_hash(
                    "#".join(
                        [user_id, organization_id, edge["id"], securerandomstring(20)]
                    ).encode("utf-8"),
                    32,
                )
                edge["id"] = f"edge__{new_edge_id}"
                if edge["source"] in old_to_new_id_map:
                    edge["source"] = old_to_new_id_map[edge["source"]]
                if edge["target"] in old_to_new_id_map:
                    edge["target"] = old_to_new_id_map[edge["target"]]

        update_roadmap_graph()

        return new_roadmap_graph, new_roadmap_content


async def get_roadmap_service(
    db: AsyncSession = Depends(get_db),
    organization_service: OrganizationService = Depends(get_organization_service),
    team_service: TeamService = Depends(get_team_service),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
) -> RoadmapService:
    return RoadmapService(
        repo=RoadmapRepository(db=db),
        organization_service=organization_service,
        team_service=team_service,
        roadmap_access_service=roadmap_access_service,
    )
