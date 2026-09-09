import time

from core.exception import AgentExecutionError, BadRequestException
from shared.redis import redis


TIME_COMMITMENTS = {
    "tier_1": {
        "id": 1,
        "name": "Crash",
        "duration": "1-2 Hours",
        "promise": "Zero to basics, fast",
        "max_total_subtopic_count": 7,
    },
    "tier_2": {
        "id": 2,
        "name": "Essentials",
        "duration": "1 Week",
        "promise": "Must-know core skills",
        "max_total_subtopic_count": 12,
    },
    "tier_3": {
        "id": 3,
        "name": "Practical",
        "duration": "1 Month",
        "promise": "Learn by doing",
        "max_total_subtopic_count": 20,
    },
    "tier_4": {
        "id": 4,
        "name": "Advanced",
        "duration": "3 Months",
        "promise": "Beyond the basics",
        "max_total_subtopic_count": 30,
    },
    "tier_5": {
        "id": 5,
        "name": "Pro",
        "duration": "6 Months or more",
        "promise": "Industry-ready mastery",
        "max_total_subtopic_count": 45,
    },
}


def get_time_commitment_by_id(tier_id: str):
    if tier_id in TIME_COMMITMENTS:
        return TIME_COMMITMENTS[tier_id]
    raise BadRequestException("Time commitment not found")


def pseudo_stream_text(text, delay=0.05):
    words = text.split(" ")

    for word in words:
        yield word + " "
        time.sleep(delay)


# def stream_question_pseudo(result, run_id, thread_id, user_id):
#     full_text = result.question

#     for word in pseudo_stream_text(full_text):
#         content = [{
#             "type": "text",
#             "data": {"text": word}
#         }]

#         await publish_content_block(
#             message_id=run_id,
#             thread_id=thread_id,
#             user_id=user_id,
#             role="assistant",
#             content=content
#         )


async def check_stop_signal(
    thread_id: str, user_id: str, run_id: str, node_name: str, message_id: str
):
    try:
        signal_id = f"stop_signal::{thread_id}::{user_id}::{run_id}"
        check_key = await redis.get(signal_id)
        if check_key:
            raise AgentExecutionError(
                message="Stop signal received",
                node=node_name,
                message_id=message_id,
                reason="STOP",
                original_error="Stop signal received",
            )
    except Exception as e:
        raise e
