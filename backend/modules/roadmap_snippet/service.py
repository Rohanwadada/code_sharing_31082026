import copy
from collections import defaultdict

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.exception import AppException
from core.time import get_current_timestamp
from modules.roadmap.exceptions import RoadmapNotFound
from modules.roadmap.model import Roadmap
from modules.roadmap.service import RoadmapService, get_roadmap_service
from modules.roadmap_snippet.exceptions import (
    ComponentAlreadyAdded,
    ComponentLimitReached,
)
from modules.roadmap_snippet.model import RoadmapUserData
from modules.roadmap_snippet.schema import SnippetAddToRoadmap
from shared.db.dependencies import get_db

COMPONENT_LIMIT = 10


class RoadmapSnippetService:
    def __init__(self, db: AsyncSession, roadmap_service: RoadmapService) -> None:
        self.db = db
        self.roadmap_service = roadmap_service

    async def find_roadmap_snippets(
        self, query: str, organization_id: str, team_id: str | None, roadmap_id: str
    ):
        # Convert search query to a format that handles partial matches
        query_words = query.split()
        ts_query_string = " | ".join(
            [f"{word}:*" if len(word) >= 2 else word for word in query_words]
        )

        # Build tsquery SQL expression (NO await here)
        tsquery = func.to_tsquery("english", ts_query_string)

        # Full-text search
        full_text_match = Roadmap.search_vector.op("@@")(tsquery)

        result = await self.db.scalars(
            select(Roadmap).where(
                full_text_match,
                Roadmap.roadmap_id != roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        roadmaps = result.all()

        response = []

        for roadmap in roadmaps:
            roadmap_graph = roadmap.roadmap_graph or {}

            matching_nodes = [
                node
                for node in roadmap_graph.get("nodes", [])
                if isinstance(node.get("data"), dict)
                and any(
                    word.lower() in node["data"].get("label", "").lower()
                    for word in query_words
                )
            ]

            for node in matching_nodes:
                subtree = self.extract_subtree(
                    data=roadmap_graph, start_node_id=node["id"]
                )

                exact_match = node["data"].get("label", "").lower() == query.lower()

                if (
                    node.get("type") in ["subtopic", "assignmentNode"]
                    and "parentId" in node
                    and subtree.get("nodes")
                ):
                    subtree["nodes"][0].pop("parentId", None)
                    subtree["nodes"][0].pop("extent", None)

                response.append(
                    {
                        "r_id": roadmap.roadmap_id,
                        "r_title": roadmap.title,
                        "node": node,
                        "subtree": subtree,
                        "exact_match": exact_match,
                    }
                )

        return {"message": "Roadmap search successful", "snippets": response}

    def extract_subtree(self, data, start_node_id):
        # Build adjacency list representation of the graph
        tree = defaultdict(list)
        for edge in data["edges"]:
            tree[edge["source"]].append(edge["target"])

        # Create a lookup for node details
        node_lookup = {node["id"]: node for node in data["nodes"]}

        # DFS to extract the subtree
        subtree_nodes = {}
        subtree_edges = []

        def dfs(node_id, is_start_topic=False):
            if node_id not in node_lookup:
                return

            current_node = node_lookup[node_id]

            # Copy the node to avoid modifying original data
            subtree_nodes[node_id] = copy.deepcopy(current_node)

            # If it's a group node, include all child nodes (where parentId == groupNodeId)
            if (
                current_node.get("type") == "subtopicGroup"
                or current_node.get("type") == "topicGroup"
            ):
                group_children = [
                    node for node in data["nodes"] if node.get("parentId") == node_id
                ]
                for child in group_children:
                    child_id = child["id"]
                    subtree_nodes[child_id] = copy.deepcopy(child)

                    # Also, perform DFS on child nodes if they have outgoing edges
                    if child_id in tree:
                        dfs(child_id, is_start_topic)

            # Traverse direct children from edges
            for child in tree.get(node_id, []):
                child_node = node_lookup.get(child, None)

                # If start node was topic, skip child nodes that are topics
                if (
                    child_node
                    and is_start_topic
                    and child_node.get("type") in ["topic", "topicGroup"]
                ):
                    continue

                # Add edge
                edge = next(
                    edge
                    for edge in data["edges"]
                    if edge["source"] == node_id and edge["target"] == child
                )
                subtree_edges.append(copy.deepcopy(edge))

                dfs(child, is_start_topic)  # Pass down the initial condition

        # Check if start node is a topic
        start_is_topic = node_lookup[start_node_id].get("type") in [
            "topic",
            "topicGroup",
        ]

        # Start DFS with the initial condition
        dfs(start_node_id, start_is_topic)

        return {"nodes": list(subtree_nodes.values()), "edges": subtree_edges}

    async def add_snippet_to_roadmap(
        self, user_id: str, roadmap_id: str, data: SnippetAddToRoadmap
    ):
        existing_roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)
        if not existing_roadmap:
            raise RoadmapNotFound("Roadmap not found!!")

        snippet = data.snippet
        ref_roadmap_id = data.ref_rid
        snippet_nodes = snippet["nodes"]
        roadmap_graph = existing_roadmap.roadmap_graph
        roadmap_content = existing_roadmap.roadmap_content
        roadmap_metadata = existing_roadmap.roadmap_metadata

        snippet_node_contents = await self.extract_snippet_nodes_contents(
            snippet_nodes=snippet_nodes, ref_roadmap_id=ref_roadmap_id
        )
        new_snippet_graph, new_snippet_content = (
            self.roadmap_service.regenerate_roadmap(
                user_id=user_id,
                organization_id="None",
                roadmap_graph=snippet,
                roadmap_content=snippet_node_contents,
            )
        )
        updated_roadmap_content = roadmap_content | new_snippet_content

        roadmap_graph["nodes"] = roadmap_graph["nodes"] + new_snippet_graph["nodes"]
        roadmap_graph["edges"] = roadmap_graph["edges"] + new_snippet_graph["edges"]

        # update content counts
        new_content_count = {"public": 0, "premium": 0}
        for key, value in updated_roadmap_content.items():
            if (
                "deleted" not in value or not value["deleted"]
            ):  # if deleted key not present then valid content
                for link in value["links"]:
                    new_content_count[link["accessType"]] += 1

        roadmap_metadata["content_count"] = new_content_count

        # db update
        existing_roadmap.roadmap_graph = roadmap_graph
        existing_roadmap.roadmap_content = updated_roadmap_content
        existing_roadmap.roadmap_metadata = roadmap_metadata

        flag_modified(existing_roadmap, "roadmap_graph")
        flag_modified(existing_roadmap, "roadmap_content")
        flag_modified(existing_roadmap, "roadmap_metadata")

        await self.db.commit()
        return new_snippet_graph

    async def extract_snippet_nodes_contents(
        self, snippet_nodes: list, ref_roadmap_id: str
    ):
        snippet_node_contents = {}

        roadmap = await self.roadmap_service.get_by_id(roadmap_id=ref_roadmap_id)
        if not roadmap:
            raise RoadmapNotFound(f"Roadmap {ref_roadmap_id} not found!!")

        roadmap_content = roadmap.roadmap_content  # Assuming this contains all nodes
        for node in snippet_nodes:
            node_id = node["id"]
            snippet_node_contents[node_id] = roadmap_content.get(
                node_id, {"links": [], "title": "", "description": ""}
            )

        return snippet_node_contents

    async def add_component_to_bag(
        self, user_id: str, organization_id: str, component: dict
    ):

        existing_roadmap_user_data = await self.db.scalar(
            select(RoadmapUserData).where(
                RoadmapUserData.user_id == user_id,
                RoadmapUserData.organization_id == organization_id,
            )
        )

        current_timestamp = get_current_timestamp()
        if not existing_roadmap_user_data:
            user_preferences = {"components": [component]}
            new_roadmap_user_data = RoadmapUserData(
                user_id=user_id,
                organization_id=organization_id,
                preferences=user_preferences,
                created_at=current_timestamp,
                updated_at=current_timestamp,
            )
            self.db.add(new_roadmap_user_data)
        else:
            user_preferences = existing_roadmap_user_data.preferences
            if len(user_preferences.get("components", [])) == COMPONENT_LIMIT:
                raise ComponentLimitReached(
                    "Component limit Reached. You can add upto 10 components"
                )

            for c in user_preferences.get("components", []):
                if (
                    component["node"]["id"] == c["node"]["id"]
                    and component["r_id"] == c["r_id"]
                ):
                    raise ComponentAlreadyAdded("Component already added")
            user_preferences["components"] = user_preferences.get("components", [])
            user_preferences["components"].append(component)

            # db update
            existing_roadmap_user_data.preferences = user_preferences
            existing_roadmap_user_data.updated_at = current_timestamp

            flag_modified(existing_roadmap_user_data, "preferences")

        await self.db.commit()
        return {"message": "Component added successfully"}

    async def get_user_all_components(self, user_id: str, organization_id: str):
        existing_roadmap_user_data = await self.db.scalar(
            select(RoadmapUserData).where(
                RoadmapUserData.user_id == user_id,
                RoadmapUserData.organization_id == organization_id,
            )
        )

        user_preferences = (
            existing_roadmap_user_data.preferences if existing_roadmap_user_data else {}
        )
        components = user_preferences.get("components", [])
        return {"components": components}

    async def remove_component_from_bag(
        self, user_id: str, organization_id: str, component: dict
    ):

        existing_roadmap_user_data = await self.db.scalar(
            select(RoadmapUserData).where(
                RoadmapUserData.user_id == user_id,
                RoadmapUserData.organization_id == organization_id,
            )
        )

        if not existing_roadmap_user_data:
            raise AppException("Something went wrong")

        user_preferences = existing_roadmap_user_data.preferences
        components = user_preferences.get("components", [])
        current_timestamp = get_current_timestamp()
        for i, c in enumerate(components):
            if (
                component["node"]["id"] == c["node"]["id"]
                and component["r_id"] == c["r_id"]
            ):
                components.pop(i)
                break
        user_preferences["components"] = components

        # db update
        existing_roadmap_user_data.preferences = user_preferences
        existing_roadmap_user_data.updated_at = current_timestamp

        flag_modified(existing_roadmap_user_data, "preferences")

        await self.db.commit()

        return {"message": "Component removed successfully"}


async def get_roadmap_snippet_service(
    db: AsyncSession = Depends(get_db),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    return RoadmapSnippetService(db=db, roadmap_service=roadmap_service)
