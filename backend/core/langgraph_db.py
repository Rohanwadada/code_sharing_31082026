from typing import cast

from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool
from core.config import settings

# langgraph_pool: AsyncConnectionPool[AsyncConnection] = AsyncConnectionPool(
#     conninfo=(
#         str(settings.database_url)
#     ),
#     open=False,
#     min_size=1,
#     max_size=10,
#     connection_class=AsyncConnection,
#     kwargs={
#         "autocommit": True,
#         "row_factory": dict_row,
#     },
# )

# async def init_langgraph_checkpointer():
#     await langgraph_pool.open()
#     saver = AsyncPostgresSaver(langgraph_pool)
#     await saver.setup()
#     return saver


langgraph_pool = AsyncConnectionPool(
    conninfo=str(settings.langgraph_database_url),
    open=False,
    min_size=1,
    max_size=10,
    connection_class=AsyncConnection,
    kwargs={
        "autocommit": True,
        "row_factory": dict_row,
    },
)

# This is only for static typing / pyright
LangGraphPool = AsyncConnectionPool[AsyncConnection[DictRow]]

typed_langgraph_pool = cast(LangGraphPool, langgraph_pool)


def create_worker_pool() -> LangGraphPool:
    pool = AsyncConnectionPool(
        conninfo=str(settings.langgraph_database_url),
        open=False,
        min_size=1,
        max_size=5,
        connection_class=AsyncConnection,
        kwargs={
            "autocommit": True,
            "row_factory": dict_row,
        },
    )
    return cast(LangGraphPool, pool)
