import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from core.database import AsyncSessionLocal
from modules.features.model import Features

FEATURES = [
    {
        "feature_key": "organization",
        "feature_name": "Organization",
        "category": "management",
        "description": "Organization management module",
        "display_order": 1,
        "children": [
            {
                "feature_key": "org:create",
                "feature_name": "Create Organization",
                "category": "management",
                "description": "Create new organizations",
                "display_order": 1,
            },
            {
                "feature_key": "org:manage",
                "feature_name": "Manage Organization",
                "category": "management",
                "description": "Edit organization details and settings",
                "display_order": 2,
            },
            {
                "feature_key": "org:delete",
                "feature_name": "Delete Organization",
                "category": "management",
                "description": "Delete organizations",
                "display_order": 3,
            },
        ],
    },
    {
        "feature_key": "team",
        "feature_name": "Team",
        "category": "management",
        "description": "Team management module",
        "display_order": 2,
        "children": [
            {
                "feature_key": "team:create",
                "feature_name": "Create Team",
                "category": "management",
                "description": "Create new teams",
                "display_order": 1,
            },
            {
                "feature_key": "team:manage",
                "feature_name": "Manage Team",
                "category": "management",
                "description": "Edit team details and settings",
                "display_order": 2,
            },
            {
                "feature_key": "team:delete",
                "feature_name": "Delete Team",
                "category": "management",
                "description": "Delete teams",
                "display_order": 3,
            },
        ],
    },
    {
        "feature_key": "role",
        "feature_name": "Role",
        "category": "management",
        "description": "Role and access control management",
        "display_order": 3,
        "children": [
            {
                "feature_key": "role:create",
                "feature_name": "Create Role",
                "category": "management",
                "description": "Create new roles",
                "display_order": 1,
            },
            {
                "feature_key": "role:manage",
                "feature_name": "Manage Role",
                "category": "management",
                "description": "Edit roles and assign permissions",
                "display_order": 2,
            },
            {
                "feature_key": "role:delete",
                "feature_name": "Delete Role",
                "category": "management",
                "description": "Delete roles",
                "display_order": 3,
            },
        ],
    },
    {
        "feature_key": "member",
        "feature_name": "Member",
        "category": "management",
        "description": "Member management within organizations and teams",
        "display_order": 4,
        "children": [
            {
                "feature_key": "member:add",
                "feature_name": "Add Member",
                "category": "management",
                "description": "Add members to organization or team",
                "display_order": 1,
            },
            {
                "feature_key": "member:remove",
                "feature_name": "Remove Member",
                "category": "management",
                "description": "Remove members from organization or team",
                "display_order": 2,
            },
        ],
    },
    {
        "feature_key": "roadmap",
        "feature_name": "Roadmap",
        "category": "content",
        "description": "Roadmap creation and management",
        "display_order": 5,
        "children": [
            {
                "feature_key": "roadmap:create",
                "feature_name": "Create Roadmap",
                "category": "content",
                "description": "Create new roadmaps",
                "display_order": 1,
            },
            {
                "feature_key": "roadmap:edit",
                "feature_name": "Edit Roadmap",
                "category": "content",
                "description": "Edit roadmap details and content",
                "display_order": 2,
            },
            {
                "feature_key": "roadmap:delete",
                "feature_name": "Delete Roadmap",
                "category": "content",
                "description": "Delete roadmaps",
                "display_order": 3,
            },
            {
                "feature_key": "roadmap:assign",
                "feature_name": "Assign Roadmap",
                "category": "content",
                "description": "Assign roadmaps to users or teams",
                "display_order": 4,
            },
        ],
    },
    {
        "feature_key": "content",
        "feature_name": "Content",
        "category": "content",
        "description": "Roadmap content and snippet management",
        "display_order": 6,
        "children": [
            {
                "feature_key": "content:create",
                "feature_name": "Create Content",
                "category": "content",
                "description": "Create new content and snippets",
                "display_order": 1,
            },
            {
                "feature_key": "content:edit",
                "feature_name": "Edit Content",
                "category": "content",
                "description": "Edit existing content",
                "display_order": 2,
            },
            {
                "feature_key": "content:delete",
                "feature_name": "Delete Content",
                "category": "content",
                "description": "Delete content",
                "display_order": 3,
            },
        ],
    },
    {
        "feature_key": "thread",
        "feature_name": "Thread",
        "category": "chat",
        "description": "Thread and chat management",
        "display_order": 7,
        "children": [
            {
                "feature_key": "thread:create",
                "feature_name": "Create Thread",
                "category": "chat",
                "description": "Create new chat threads",
                "display_order": 1,
            },
            {
                "feature_key": "thread:delete",
                "feature_name": "Delete Thread",
                "category": "chat",
                "description": "Delete chat threads",
                "display_order": 2,
            },
        ],
    },
    {
        "feature_key": "ai",
        "feature_name": "AI Features",
        "category": "ai",
        "description": "AI-powered content generation and transcription",
        "display_order": 8,
        "children": [
            {
                "feature_key": "ai:content_generation",
                "feature_name": "AI Content Generation",
                "category": "ai",
                "description": "Generate content using AI",
                "display_order": 1,
            },
            {
                "feature_key": "ai:transcription",
                "feature_name": "Audio Transcription",
                "category": "ai",
                "description": "Transcribe audio to text",
                "display_order": 2,
            },
        ],
    },
    {
        "feature_key": "learning_progress",
        "feature_name": "Learning Progress",
        "category": "learning",
        "description": "Track learning progress and completion",
        "display_order": 9,
        "children": [],
    },
]


async def seed_features() -> None:
    async with AsyncSessionLocal() as db:
        created_count = 0
        updated_count = 0

        for feature_def in FEATURES:
            result = await db.execute(
                select(Features).where(
                    Features.feature_key == feature_def["feature_key"]
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.feature_name = feature_def["feature_name"]
                existing.category = feature_def["category"].lower()
                existing.description = feature_def["description"]
                existing.display_order = feature_def["display_order"]
                updated_count += 1
                parent_id = existing.feature_id
                print(f"  [UPDATE] {feature_def['feature_key']}")
            else:
                new_feature = Features(
                    feature_key=feature_def["feature_key"],
                    feature_name=feature_def["feature_name"],
                    category=feature_def["category"].lower(),
                    description=feature_def["description"],
                    display_order=feature_def["display_order"],
                )
                db.add(new_feature)
                await db.flush()
                parent_id = new_feature.feature_id
                created_count += 1
                print(f"  [CREATE] {feature_def['feature_key']}")

            for child_def in feature_def.get("children", []):
                child_result = await db.execute(
                    select(Features).where(
                        Features.feature_key == child_def["feature_key"]
                    )
                )
                existing_child = child_result.scalar_one_or_none()

                if existing_child:
                    existing_child.feature_name = child_def["feature_name"]
                    existing_child.category = child_def["category"].lower()
                    existing_child.description = child_def["description"]
                    existing_child.display_order = child_def["display_order"]
                    existing_child.parent_id = parent_id
                    updated_count += 1
                    print(f"    [UPDATE] {child_def['feature_key']}")
                else:
                    new_child = Features(
                        feature_key=child_def["feature_key"],
                        feature_name=child_def["feature_name"],
                        parent_id=parent_id,
                        category=child_def["category"].lower(),
                        description=child_def["description"],
                        display_order=child_def["display_order"],
                    )
                    db.add(new_child)
                    created_count += 1
                    print(f"    [CREATE] {child_def['feature_key']}")

        await db.commit()
        print(f"\nDone. Created: {created_count}, Updated: {updated_count}")


if __name__ == "__main__":
    asyncio.run(seed_features())
