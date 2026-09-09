import json
import logging
from typing import Union


from modules.roadmap_agent.schema import SSEMessage
from shared.redis import redis

logger = logging.getLogger(__name__)


async def stream_to_redis(channel: str, message: Union[dict, str]):
    # print("Channel ID: ", channel)
    # print("Message: ", message)
    try:
        await redis.publish(channel=channel, message=json.dumps(message))
    except Exception as e:
        logger.error(f"Error in redis streaming pub/sub: {str(e)}", exc_info=True)
        raise


async def publish_content_block(
    message_id: str,
    thread_id: str,
    user_id: str,
    role: str,
    content: list[dict],
    overwrite: bool = False,
):
    try:
        # print(
        #     f"Sending content block to : {message_id} :::: {thread_id} :::: {user_id}"
        # )
        redis_channel_id = f"thread:{thread_id}:{user_id}"
        message: SSEMessage = SSEMessage(
            message_id=message_id,
            thread_id=thread_id,
            role="assistant",
            content=content,
            overwrite=overwrite,
        )

        await stream_to_redis(
            channel=redis_channel_id, message=message.model_dump_json()
        )
    except Exception as e:
        logger.error(f"Error in redis streaming pub/sub: {str(e)}", exc_info=True)
        raise
