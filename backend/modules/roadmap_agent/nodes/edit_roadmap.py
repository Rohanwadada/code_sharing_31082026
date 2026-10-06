import logging
import random
import re
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime

from core.exception import AgentExecutionError
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.nodes.utils.dsl_augmenter import augment_dsl, deaugment_dsl
from modules.roadmap_agent.prompts import EDIT_ROADMAP_SYSTEM_PROMPT
from modules.roadmap_agent.schema import (
    NodeInfo,
    Position,
    RoadmapDslEditPlan,
    RoadmapEditOp,
)
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import check_stop_signal, pseudo_stream_text
from shared.llm.gemini import get_gemini_instance, log_token_usage
from shared.sse_stream import publish_content_block


logger = logging.getLogger(__name__)


async def edit_roadmap(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    is_retry = bool(config.get("configurable", {}).get("is_retry"))
    message_id = config.get("configurable", {}).get(
        "run_id" if not is_retry else "message_id"
    )
    organization_id = config.get("configurable", {}).get("organization_id")
    team_id = config.get("configurable", {}).get("team_id")
    project_id = config.get("configurable", {}).get("project_id")

    thread_service = runtime.context.thread_service
    artifact_service = runtime.context.artifact_service

    try:
        run_id = config.get("configurable", {}).get("run_id")
        thread_id, user_id = state["thread_id"], state["user_id"]

        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="edit_roadmap",
            message_id=str(message_id),
        )

        base_artifact = await artifact_service.get_latest_roadmap_artifact(
            organization_id=str(organization_id), team_id=team_id, thread_id=thread_id
        )
        current_dsl = (base_artifact.artifact_data or {}).get("dsl")
        if not current_dsl:
            raise ValueError("Latest roadmap artifact does not contain DSL")

        user_message = (state.get("user_message") or "").strip()
        if not user_message:
            raise ValueError("No edit request provided")


        current_dsl = deaugment_dsl(dsl=current_dsl)
        
        annotated_dsl = annotate_dsl(current_dsl)
        edit_plan = _generate_edit_plan(
            user_message=user_message, annotated_dsl=annotated_dsl
        )

        if len(edit_plan.ops) == 0:
            content = [
                {
                    "type": "text",
                    "data": {"text": edit_plan.message},
                }
            ]
            for chunk in pseudo_stream_text(content[0]["data"]["text"]):
                text_content = [{"type": "text", "data": {"text": chunk}}]

                await publish_content_block(
                    message_id=str(run_id if not is_retry else message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=text_content,
                )
            await thread_service.save_conversation_to_db(
                organization_id=str(organization_id),
                team_id=team_id,
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=content,
            )
        else:
            new_dsl = apply_ops(current_dsl, edit_plan.ops)
            edit_summary = edit_plan.message
            logger.info(f"NEW DSL: {new_dsl}")
            logger.info(f"EDIT SUMMARY: {new_dsl}")
            _validate_roadmap_dsl(new_dsl)

            new_title = _get_roadmap_title(new_dsl)
            base_data = base_artifact.artifact_data or {}
            base_artifact_metadata = base_artifact.artifact_metadata or {}

            new_artifact_version_id = str(uuid4())
            new_artifact = await artifact_service.create_artifact(
                organization_id=str(organization_id),
                team_id=team_id,
                project_id=project_id,
                thread_id=thread_id,
                user_id=user_id,
                artifact_title=new_title,
                artifact_description=new_title,
                artifact_data={
                    "dsl": augment_dsl(new_dsl),
                    "base_artifact_id": base_artifact.artifact_id,
                    "edit_request": user_message,
                    "prompt": base_data.get("prompt", ""),
                    "time_commitment": base_data.get("time_commitment", ""),
                },
                artifact_metadata={
                    "generation_status": "incomplete",
                    "edit_metadata": {
                        "base_artifact_id": base_artifact.artifact_id,
                        "ops": [op.model_dump() for op in edit_plan.ops],
                    },
                    "version": {
                        "id": new_artifact_version_id,
                        "version_tag": base_artifact_metadata.get("version", {}).get(
                            "version_tag", 0
                        )
                        + 1,
                    },
                },
            )

            content = [
                {
                    "type": "text",
                    "data": {"text": random.choice(INITIAL_MESSAGE)},
                }
            ]
            for chunk in pseudo_stream_text(content[0]["data"]["text"]):
                text_content = [{"type": "text", "data": {"text": chunk}}]

                await publish_content_block(
                    message_id=str(run_id if not is_retry else message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=text_content,
                )
            artifact_message_blocks = [
                {
                    "artifact_id": new_artifact["artifact_id"],
                    "type": "artifact",
                    "subtype": "roadmap",
                    "data": {
                        "name": new_title,
                        "version": {
                            "id": new_artifact_version_id,
                            "version_tag": base_artifact_metadata.get(
                                "version", {}
                            ).get("version_tag", 0)
                            + 1,
                        },
                    },
                }
            ]

            content.extend(artifact_message_blocks)
            await publish_content_block(
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=artifact_message_blocks,
            )

            if isinstance(edit_summary, str) and len(edit_summary.strip()) != 0:
                edit_summary_message_block = [
                    {
                        "type": "text",
                        "data": {"text": edit_summary},
                    }
                ]
                for chunk in pseudo_stream_text(
                    edit_summary_message_block[0]["data"]["text"]
                ):
                    text_content = [{"type": "text", "data": {"text": chunk}}]

                    await publish_content_block(
                        message_id=str(run_id if not is_retry else message_id),
                        thread_id=thread_id,
                        user_id=user_id,
                        role="assistant",
                        content=text_content,
                    )
                content.extend(edit_summary_message_block)

            await thread_service.save_conversation_to_db(
                organization_id=str(organization_id),
                team_id=team_id,
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=content,
            )

        return {
            "assistant_message": "Edit request fullfilled.",
        }
    except Exception as e:
        if isinstance(e, AgentExecutionError):
            ctx = getattr(e, "context", {})

            raise AgentExecutionError(
                message=str(e),
                node=ctx.get("node"),
                message_id=ctx.get("message_id"),
                original_error=ctx.get("original_error"),
                reason=ctx.get("reason"),
            ) from e
        logger.error("Roadmap edit failed: %s", str(e), exc_info=True)
        raise AgentExecutionError(
            message="Roadmap edit failed",
            node="edit_roadmap",
            message_id=message_id,
            original_error=str(e),
        ) from e


def _generate_edit_plan(user_message: str, annotated_dsl: str) -> RoadmapDslEditPlan:
    gemini = get_gemini_instance(temperature=0.1)
    structured_llm = gemini.with_structured_output(RoadmapDslEditPlan, include_raw=True)
    t0 = time.time()
    res_output = structured_llm.invoke(
        [
            SystemMessage(content=EDIT_ROADMAP_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    "<user_edit_request>\n"
                    f"{user_message}\n"
                    "</user_edit_request>\n\n"
                    "<annotated_roadmap_dsl>\n"
                    f"{annotated_dsl}\n"
                    "</annotated_roadmap_dsl>"
                )
            ),
        ]
    )
    raw_msg = res_output.get("raw") if isinstance(res_output, dict) else None
    response = res_output.get("parsed") if isinstance(res_output, dict) else res_output

    if raw_msg:
        log_token_usage(
            raw_msg,
            feature_name="Roadmap Edit Plan",
            model_name="gemini-2.5-flash",
            latency=f"{time.time() - t0:.2f}s",
        )

    if isinstance(response, RoadmapDslEditPlan):
        return response
    return RoadmapDslEditPlan.model_validate(response)


def annotate_dsl(dsl: str) -> str:
    lines = _normalize_dsl(dsl).splitlines()
    topic = module = subtopic = 0
    annotated: List[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("##"):
            annotated.append(f"{line} [root]")
        elif stripped.startswith("## ") and not stripped.startswith("###"):
            topic += 1
            module = subtopic = 0
            annotated.append(f"{line} [t{topic}]")
        elif stripped.startswith("### "):
            module += 1
            subtopic = 0
            annotated.append(f"{line} [t{topic}.m{module}]")
        elif stripped.startswith("- "):
            subtopic += 1
            annotated.append(f"{line} [t{topic}.m{module}.s{subtopic}]")
        else:
            annotated.append(line)
    return "\n".join(annotated)


def build_index(dsl: str) -> Dict[str, NodeInfo]:
    lines = _normalize_dsl(dsl).splitlines()
    index: Dict[str, NodeInfo] = {}
    topic = module = subtopic = 0
    stack: List[NodeInfo] = []

    for i, line in enumerate(lines):
        level, path = _line_level_and_path(line, topic, module, subtopic)
        if path is None:
            continue
        if level == 1:
            topic += 1
            module = subtopic = 0
            path = f"t{topic}"
        elif level == 2:
            module += 1
            subtopic = 0
            path = f"t{topic}.m{module}"
        elif level == 3:
            subtopic += 1
            path = f"t{topic}.m{module}.s{subtopic}"

        while stack and stack[-1].level >= level:
            stack.pop().end = i
        node = NodeInfo(path=path, content=line, line=i, level=level, end=len(lines))
        index[path] = node
        stack.append(node)

    return index


def _line_level_and_path(
    line: str, topic: int, module: int, subtopic: int
) -> tuple[int, Optional[str]]:
    stripped = line.strip()
    if stripped.startswith("# ") and not stripped.startswith("##"):
        return 0, "root"
    if stripped.startswith("## ") and not stripped.startswith("###"):
        return 1, f"t{topic + 1}"
    if stripped.startswith("### "):
        return 2, f"t{topic}.m{module + 1}"
    if stripped.startswith("- "):
        return 3, f"t{topic}.m{module}.s{subtopic + 1}"
    return -1, None


def apply_ops(old_dsl: str, ops: List[RoadmapEditOp]) -> str:
    old_dsl = _normalize_dsl(old_dsl)
    if not ops:
        return old_dsl

    old_index = build_index(old_dsl)
    _validate_ops(ops, old_index)

    new_lines = old_dsl.splitlines()
    refs: Dict[str, str] = {}

    for op in _sort_ops(ops):
        if op.op == "remove_node":
            new_lines = _remove_node(new_lines, old_index[op.path])  # type: ignore[index]
        elif op.op == "move_node":
            new_lines = _move_node(new_lines, old_index, op)
        elif op.op == "update_title":
            new_lines = _update_title(new_lines, old_index[op.path], op.value or "")  # type: ignore[index]
        elif op.op == "update_level":
            new_lines = _update_level(new_lines, old_index[op.path], op.level)  # type: ignore[index]
        elif op.op in {"add_topic", "add_module", "add_subtopic"}:
            new_lines = _add_node(new_lines, old_index, op, refs)

    new_lines = _prune_empty_containers(new_lines)
    return _normalize_dsl("\n".join(new_lines))


def _sort_ops(ops: List[RoadmapEditOp]) -> List[RoadmapEditOp]:
    order = {
        "remove_node": 0,
        "move_node": 1,
        "update_title": 2,
        "update_level": 2,
        "add_topic": 3,
        "add_module": 3,
        "add_subtopic": 3,
    }
    return [
        op
        for _, op in sorted(
            enumerate(ops), key=lambda item: (order[item[1].op], item[0])
        )
    ]


def _validate_ops(ops: List[RoadmapEditOp], old_index: Dict[str, NodeInfo]) -> None:
    removed = {op.path for op in ops if op.op == "remove_node" and op.path}
    add_ids = {op.id for op in ops if op.id}

    for op in ops:
        if op.path and op.path not in old_index and op.path not in add_ids:
            raise ValueError(f"path {op.path} does not exist")
        if op.ref and op.ref not in add_ids:
            raise ValueError(f"ref {op.ref} does not exist")
        if op.position and op.position.type in {"before", "after"}:
            if not op.position.anchor or op.position.anchor not in old_index:
                raise ValueError(f"anchor {op.position.anchor} does not exist")
            if _is_removed(op.position.anchor, removed):
                raise ValueError(f"anchor {op.position.anchor} is being removed")
        if op.op != "remove_node" and op.path and _is_removed(op.path, removed):
            raise ValueError(f"{op.path} is both removed and targeted")
        if op.op == "add_topic":
            _validate_added_topic_subtree(op.value or "")
        if op.op == "add_module":
            _validate_added_module_subtree(op.value or "")
        if op.op == "move_node":
            if not op.path or not op.target_parent:
                raise ValueError("move_node requires path and target_parent")
            if op.target_parent not in old_index:
                raise ValueError(f"target_parent {op.target_parent} does not exist")
            if _is_removed(op.path, removed):
                raise ValueError(f"move source {op.path} is inside removed subtree")
            if op.target_parent.startswith(op.path + "."):
                raise ValueError("cannot move a node inside itself")


def _validate_added_topic_subtree(value: str) -> None:
    lines = _normalize_dsl(value).splitlines()
    if (
        not lines
        or not lines[0].strip().startswith("## ")
        or lines[0].strip().startswith("###")
    ):
        raise ValueError("add_topic value must start with a topic line (`## ...`)")

    module_line_indexes = [
        i for i, line in enumerate(lines) if line.strip().startswith("### ")
    ]
    if not module_line_indexes:
        raise ValueError("add_topic value must include at least one module")

    for module_index in module_line_indexes:
        module_end = len(lines)
        for i in range(module_index + 1, len(lines)):
            stripped = lines[i].strip()
            if stripped.startswith("## ") or stripped.startswith("### "):
                module_end = i
                break
        if not any(
            lines[i].strip().startswith("- ")
            for i in range(module_index + 1, module_end)
        ):
            raise ValueError("every module in add_topic value must include subtopics")


def _validate_added_module_subtree(value: str) -> None:
    lines = _normalize_dsl(value).splitlines()
    if not lines or not lines[0].strip().startswith("### "):
        raise ValueError("add_module value must start with a module line (`### ...`)")
    if not any(line.strip().startswith("- ") for line in lines[1:]):
        raise ValueError("add_module value must include at least one subtopic")


def _is_removed(path: str, removed: set[str]) -> bool:
    return any(path == rp or path.startswith(rp + ".") for rp in removed)


def _find_line(lines: List[str], node: NodeInfo) -> int:
    matches = [
        i for i, line in enumerate(lines) if line.strip() == node.content.strip()
    ]
    if not matches:
        raise ValueError(f"Could not find node content in current DSL: {node.content}")
    return min(matches, key=lambda i: abs(i - node.line))


def _subtree_end(lines: List[str], start: int, level: int) -> int:
    end = start + 1
    while end < len(lines):
        next_level = _current_line_level(lines[end])
        if next_level >= 0 and next_level <= level:
            break
        end += 1
    return end


def _current_line_level(line: str) -> int:
    stripped = line.strip()
    if stripped.startswith("# ") and not stripped.startswith("##"):
        return 0
    if stripped.startswith("## ") and not stripped.startswith("###"):
        return 1
    if stripped.startswith("### "):
        return 2
    if stripped.startswith("- "):
        return 3
    return -1


def _remove_node(lines: List[str], node: NodeInfo) -> List[str]:
    start = _find_line(lines, node)
    end = _subtree_end(lines, start, node.level)
    return lines[:start] + lines[end:]


def _move_node(
    lines: List[str], old_index: Dict[str, NodeInfo], op: RoadmapEditOp
) -> List[str]:
    source = old_index[op.path]  # type: ignore[index]
    start = _find_line(lines, source)
    end = _subtree_end(lines, start, source.level)
    extracted = lines[start:end]
    remaining = lines[:start] + lines[end:]
    insert_at = _find_insert_index(remaining, old_index, op.target_parent, op.position)  # type: ignore[arg-type]
    return remaining[:insert_at] + extracted + remaining[insert_at:]


def _update_title(lines: List[str], node: NodeInfo, value: str) -> List[str]:
    idx = _find_line(lines, node)
    lines = list(lines)
    if node.level == 0:
        lines[idx] = value if value.strip().startswith("# ") else f"# {value.strip()}"
    elif node.level == 1:
        lines[idx] = value if value.strip().startswith("## ") else f"## {value.strip()}"
    elif node.level == 2:
        lines[idx] = (
            value if value.strip().startswith("### ") else f"### {value.strip()}"
        )
    else:
        level_match = re.search(r"\s\[[123]\]\s*$", node.content)
        marker = level_match.group(0).strip() if level_match else "[1]"
        clean = re.sub(r"^[-]\s*", "", value.strip())
        clean = re.sub(r"\s\[[123]\]\s*$", "", clean).strip()
        lines[idx] = f"- {clean} {marker}"
    return lines


def _update_level(lines: List[str], node: NodeInfo, level: Optional[int]) -> List[str]:
    if node.level != 3 or level not in {1, 2, 3}:
        raise ValueError("update_level requires a subtopic path and level 1/2/3")
    idx = _find_line(lines, node)
    lines = list(lines)
    lines[idx] = re.sub(r"\s\[[123]\]\s*$", f" [{level}]", lines[idx])
    return lines


def _add_node(
    lines: List[str],
    old_index: Dict[str, NodeInfo],
    op: RoadmapEditOp,
    refs: Dict[str, str],
) -> List[str]:
    value_lines = _normalize_added_value(op).splitlines()
    if op.ref:
        parent_content = refs[op.ref]
        parent_line = _find_raw_line(lines, parent_content)
        parent_level = _current_line_level(parent_content)
        insert_at = _insert_index_under_parent(
            lines, parent_line, parent_level, op.position
        )
    elif op.path in refs:
        parent_content = refs[op.path]
        parent_line = _find_raw_line(lines, parent_content)
        parent_level = _current_line_level(parent_content)
        insert_at = _insert_index_under_parent(
            lines, parent_line, parent_level, op.position
        )
    else:
        parent_path = op.path or "root"
        insert_at = _find_insert_index(lines, old_index, parent_path, op.position)

    new_lines = lines[:insert_at] + value_lines + lines[insert_at:]
    if op.id:
        refs[op.id] = value_lines[0]
    return new_lines


def _find_insert_index(
    lines: List[str],
    old_index: Dict[str, NodeInfo],
    parent_path: str,
    position: Optional[Position],
) -> int:
    position = position or Position(type="end")
    if position.type in {"before", "after"}:
        anchor = old_index[position.anchor]  # type: ignore[index]
        # _find_line matches by content, but a prior update_title may have
        # changed the line in-place. Fall back to line number if content search fails.
        try:
            anchor_line = _find_line(lines, anchor)
        except ValueError:
            # Content was mutated by a previous update_title — use original line number
            anchor_line = min(anchor.line, len(lines) - 1)
        if position.type == "before":
            return anchor_line
        return _subtree_end(lines, anchor_line, anchor.level)

    parent = old_index.get(parent_path)
    if parent_path == "root":
        if position.type == "start":
            return 1
        return len(lines)
    if not parent:
        raise ValueError(f"parent {parent_path} does not exist")
    parent_line = _find_line(lines, parent)
    return _insert_index_under_parent(lines, parent_line, parent.level, position)


def _insert_index_under_parent(
    lines: List[str], parent_line: int, parent_level: int, position: Optional[Position]
) -> int:
    position = position or Position(type="end")
    if position.type == "start":
        return parent_line + 1
    return _subtree_end(lines, parent_line, parent_level)


def _find_raw_line(lines: List[str], content: str) -> int:
    matches = [i for i, line in enumerate(lines) if line.strip() == content.strip()]
    if not matches:
        raise ValueError(f"Could not find newly added parent: {content}")
    return matches[-1]


def _normalize_added_value(op: RoadmapEditOp) -> str:
    value = (op.value or "").strip()
    if not value:
        raise ValueError(f"{op.op} requires value")
    if op.op == "add_topic" and not value.startswith("## "):
        value = f"## {value.lstrip('#').strip()}"
    elif op.op == "add_module" and not value.startswith("### "):
        value = f"### {value.lstrip('#').strip()}"
    elif op.op == "add_subtopic":
        clean = re.sub(r"^[-]\s*", "", value).strip()
        if not re.search(r"\s\[[123]\]$", clean):
            clean = f"{clean} [1]"
        value = f"- {clean}"
    return _normalize_dsl(value).strip()


def _prune_empty_containers(lines: List[str]) -> List[str]:
    """
    Removes empty modules and topics after edits.

    Edge cases handled:
    - If all subtopics in a module are removed, remove that module.
    - If all modules in a topic are removed, remove that topic.
    """
    pruned = list(lines)
    changed = True
    while changed:
        changed = False
        module_ranges = _container_ranges(pruned, level=2)
        empty_modules = [
            (start, end)
            for start, end in module_ranges
            if not any(
                _current_line_level(pruned[i]) == 3 for i in range(start + 1, end)
            )
        ]
        if empty_modules:
            for start, end in sorted(empty_modules, reverse=True):
                del pruned[start:end]
            changed = True
            continue

        topic_ranges = _container_ranges(pruned, level=1)
        empty_topics = [
            (start, end)
            for start, end in topic_ranges
            if not any(
                _current_line_level(pruned[i]) == 2 for i in range(start + 1, end)
            )
        ]
        if empty_topics:
            for start, end in sorted(empty_topics, reverse=True):
                del pruned[start:end]
            changed = True

    return pruned


def _container_ranges(lines: List[str], level: int) -> List[tuple[int, int]]:
    ranges: List[tuple[int, int]] = []
    for i, line in enumerate(lines):
        if _current_line_level(line) == level:
            ranges.append((i, _subtree_end(lines, i, level)))
    return ranges


def _normalize_dsl(dsl: str) -> str:
    lines = [line.rstrip() for line in dsl.strip().splitlines()]
    normalized: List[str] = []
    previous_blank = False
    for line in lines:
        blank = line == ""
        if blank and previous_blank:
            continue
        normalized.append(line)
        previous_blank = blank
    return "\n".join(normalized).strip() + "\n"


def _validate_roadmap_dsl(dsl: str) -> None:
    lines = [line.strip() for line in dsl.splitlines() if line.strip()]
    if not lines or not lines[0].startswith("# ") or lines[0].startswith("##"):
        raise ValueError("Roadmap DSL must start with a single title line")

    has_topic = False
    has_module = False
    for line in lines[1:]:
        if line.startswith("## ") and not line.startswith("###"):
            has_topic = True
            has_module = False
        elif line.startswith("### "):
            if not has_topic:
                raise ValueError("Module found before topic")
            has_module = True
        elif line.startswith("- "):
            if not has_module:
                raise ValueError("Subtopic found before module")
            if not (
                line.endswith("[1]") or line.endswith("[2]") or line.endswith("[3]")
            ):
                raise ValueError(f"Invalid subtopic level marker: {line}")
        else:
            raise ValueError(f"Invalid DSL line: {line}")


def _get_roadmap_title(dsl: str) -> str:
    for line in dsl.splitlines():
        if line.startswith("# ") and not line.startswith("##"):
            return line.lstrip("# ").strip()
    return "AI edited roadmap"


INITIAL_MESSAGE = [
    "I have edited your roadmap",
    "I've updated your roadmap.",
    "Done! Your roadmap has been refreshed.",
    "I’ve made a few updates to your roadmap.",
    "I’ve updated your roadmap and created a new version.",
    "A new version of your roadmap is ready.",
    "Your roadmap just got an update.",
]
