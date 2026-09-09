import json
from datetime import datetime

import uuid_utils as uuid
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.time import get_current_timestamp
from modules.opensource_content_sources.model import OpenSourceContentSource
from modules.opensource_content_sources.schema import ContentSource
from shared.db.dependencies import get_db
from shared.redis import redis

CACHE_KEY = "opensource_content_sources"
CACHE_TTL = 300  # 5 minutes in seconds


class OpensourceContentSourcesService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add_content_sources(
        self, user_id: str, content_source_data: list[ContentSource]
    ):
        for content_source in content_source_data:
            content_source_id = (
                f"{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:5]}"
            )
            source_name = content_source.name
            source_url = content_source.url
            topic = content_source.topic
            current_timestamp = get_current_timestamp()
            new_content_source = OpenSourceContentSource(
                content_source_id=content_source_id,
                created_by=user_id,
                source_name=source_name,
                source_url=source_url,
                topic=topic,
                created_at=current_timestamp,
                updated_at=current_timestamp,
            )
            self.db.add(new_content_source)
        await self.db.commit()
        return {"status": "success"}

    async def get_opensource_content_sources(self):
        # check cache
        cached_sources = await redis.get(CACHE_KEY)

        if cached_sources:
            print("Returning source URLs from Redis cache")

            # If stored as JSON string
            return json.loads(cached_sources)  # type: ignore

        # cache miss
        print("Cache miss. Querying database for source URLs")

        content_sources = list(
            (await self.db.scalars(select(OpenSourceContentSource))).all()
        )
        source_urls = [content_source.source_url for content_source in content_sources]
        print(f"\nSource URLs: {source_urls}\n")

        # store in cache
        await redis.setex(CACHE_KEY, CACHE_TTL, json.dumps(source_urls))

        return source_urls


async def get_opensource_content_sources_service(db: AsyncSession = Depends(get_db)):
    return OpensourceContentSourcesService(db=db)
