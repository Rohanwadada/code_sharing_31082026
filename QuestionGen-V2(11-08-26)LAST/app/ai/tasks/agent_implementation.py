import json
import yaml
from pathlib import Path
from typing import Any, Iterator
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from collections.abc import Callable
load_dotenv()

from app.models.agent import (
    AgentInputState,
    BusinessScenarioInputState,
    BusinessScenarioInput,
    BusinessScenarioOutput,
    BusinessScenarioValidationInputState,
    BusinessScenarioValidationOutput,
    GraphState,
    JDCompetencyCompatibilityOutput,
    JDCompetencyCombinationOutput,
    JDCompetencyExtractionOutput,
    JDCompetencyGraphState,
    JDScoredCompetencyUploadResponse,
    JDSingleCompetencyCombinationInput,
    MCQGenerationInputState,
    MCQGenerationOutput,
    NodeDecisionOutput,
    NodeJudgeOutput,
    RegeneratedMCQQuestion,
    RegeneratedMCQQuestionWithFeedback,
    RegenerateMCQInput,
    RegenerateMCQInputWithFeedback,
    SubCompetencyInput,
)
from app.ai.config.llm import get_llm
# from app.utils.jd_loader import load_jd_content
def load_jd_content(): return ""

# Load all prompts once at module level
_base_dir = Path(__file__).resolve().parent.parent
_prompt_path = _base_dir / "prompt" / "question_type.yml"

with open(_prompt_path, "r") as _f:
    _prompt_config = yaml.safe_load(_f)



def _as_jd_competency_graph_state(state: Any) -> JDCompetencyGraphState:
    if isinstance(state, JDCompetencyGraphState):
        return state
    return JDCompetencyGraphState.model_validate(state)


def generate_jd_competencies_node(jd_text: str) -> JDCompetencyExtractionOutput:
    node_config = _prompt_config["extract_jd_competencies"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    user_prompt = user_prompt_template.format(jd_text=jd_text)

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(JDCompetencyExtractionOutput)
    result: JDCompetencyExtractionOutput = structured_llm.invoke(messages)

    return result


def generate_jd_competency_combinations_node(
    payload: JDSingleCompetencyCombinationInput,
) -> JDCompetencyCombinationOutput:
    node_config = _prompt_config["generate_jd_competency_combinations"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    user_prompt = user_prompt_template.format(
        competency_input_json=json.dumps(payload.model_dump(), indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(JDCompetencyCombinationOutput)
    result: JDCompetencyCombinationOutput = structured_llm.invoke(messages)

    return result


def verify_jd_competency_compatibility_node(
    payload: JDCompetencyCombinationOutput,
) -> JDCompetencyCompatibilityOutput:
    node_config = _prompt_config["verify_jd_competency_compatibility"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    user_prompt = user_prompt_template.format(
        compatibility_input_json=json.dumps(payload.model_dump(), indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(JDCompetencyCompatibilityOutput)
    result: JDCompetencyCompatibilityOutput = structured_llm.invoke(messages)

    return result


def select_top_jd_competency_items_node(
    combination_list: list[JDCompetencyCompatibilityOutput],
) -> JDScoredCompetencyUploadResponse:
    node_config = _prompt_config["select_top_jd_competency_items"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    items_json = [item.model_dump() for item in combination_list]
    user_prompt = user_prompt_template.format(
        top_items_input_json=json.dumps(items_json, indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(JDScoredCompetencyUploadResponse)
    result: JDScoredCompetencyUploadResponse = structured_llm.invoke(messages)

    return result


def _extract_jd_competencies_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    return {
        "competency_extraction": generate_jd_competencies_node(graph_state.jd_text),
        "current_competency_index": 0,
    }


def _select_current_jd_competency_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    if graph_state.competency_extraction is None:
        raise ValueError("competency_extraction is required before selecting a competency")
    if graph_state.current_competency_index >= len(graph_state.competency_extraction.competencies):
        raise ValueError("current_competency_index is outside the extracted competency list")

    return {
        "current_competency": graph_state.competency_extraction.competencies[
            graph_state.current_competency_index
        ],
        "current_combination": None,
        "current_compatibility": None,
        "best_attempt": None,
        "current_attempts": 0,
    }


def _generate_jd_competency_combinations_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    if graph_state.current_competency is None:
        raise ValueError("current_competency is required before generating combinations")

    combination = generate_jd_competency_combinations_node(
        JDSingleCompetencyCombinationInput(
            jd_text=graph_state.jd_text,
            competencies=[graph_state.current_competency],
        )
    )
    return {"current_combination": combination}


def _verify_jd_competency_compatibility_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    if graph_state.current_combination is None:
        raise ValueError("current_combination is required before compatibility verification")

    compatibility = verify_jd_competency_compatibility_node(graph_state.current_combination)
    best_attempt = graph_state.best_attempt
    if best_attempt is None or compatibility.compatible_score > best_attempt.compatible_score:
        best_attempt = compatibility

    return {
        "current_compatibility": compatibility,
        "best_attempt": best_attempt,
        "current_attempts": graph_state.current_attempts + 1,
    }


def _route_after_jd_compatibility(state: Any) -> str:
    graph_state = _as_jd_competency_graph_state(state)
    if graph_state.current_compatibility is None:
        return "generate_jd_competency_combinations"
    if graph_state.current_compatibility.compatible_score >= graph_state.compatibility_threshold:
        return "accept_jd_competency_combination"
    if graph_state.current_attempts >= graph_state.max_attempts:
        return "accept_jd_competency_combination"
    return "generate_jd_competency_combinations"


def _accept_jd_competency_combination_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    accepted = graph_state.current_compatibility
    if (
        accepted is None
        or accepted.compatible_score < graph_state.compatibility_threshold
    ):
        accepted = graph_state.best_attempt
    if accepted is None:
        raise ValueError("No competency combination attempt is available to accept")

    return {
        "combination_list": [accepted],
        "current_competency_index": graph_state.current_competency_index + 1,
        "current_competency": None,
        "current_combination": None,
        "current_compatibility": None,
        "best_attempt": None,
        "current_attempts": 0,
    }


def _route_after_accepting_jd_combination(state: Any) -> str:
    graph_state = _as_jd_competency_graph_state(state)
    if graph_state.competency_extraction is None:
        raise ValueError("competency_extraction is required after accepting a combination")
    if graph_state.current_competency_index >= len(graph_state.competency_extraction.competencies):
        return "select_top_jd_competency_items"
    return "select_current_jd_competency"


def _select_top_jd_competency_items_graph_node(state: Any) -> dict:
    graph_state = _as_jd_competency_graph_state(state)
    final_output = select_top_jd_competency_items_node(graph_state.combination_list)
    return {"final_output": final_output}


def build_jd_competency_graph():
    workflow = StateGraph(JDCompetencyGraphState)
    workflow.add_node("extract_jd_competencies", _extract_jd_competencies_graph_node)
    workflow.add_node("select_current_jd_competency", _select_current_jd_competency_graph_node)
    workflow.add_node("generate_jd_competency_combinations", _generate_jd_competency_combinations_graph_node)
    workflow.add_node("verify_jd_competency_compatibility", _verify_jd_competency_compatibility_graph_node)
    workflow.add_node("accept_jd_competency_combination", _accept_jd_competency_combination_graph_node)
    workflow.add_node("select_top_jd_competency_items", _select_top_jd_competency_items_graph_node)

    workflow.add_edge(START, "extract_jd_competencies")
    workflow.add_edge("extract_jd_competencies", "select_current_jd_competency")
    workflow.add_edge("select_current_jd_competency", "generate_jd_competency_combinations")
    workflow.add_edge("generate_jd_competency_combinations", "verify_jd_competency_compatibility")
    workflow.add_conditional_edges(
        "verify_jd_competency_compatibility",
        _route_after_jd_compatibility,
        {
            "generate_jd_competency_combinations": "generate_jd_competency_combinations",
            "accept_jd_competency_combination": "accept_jd_competency_combination",
        },
    )
    workflow.add_conditional_edges(
        "accept_jd_competency_combination",
        _route_after_accepting_jd_combination,
        {
            "select_current_jd_competency": "select_current_jd_competency",
            "select_top_jd_competency_items": "select_top_jd_competency_items",
        },
    )
    workflow.add_edge("select_top_jd_competency_items", END)
    return workflow.compile()


def run_jd_competency_graph_agent(
    jd_text: str,
    max_attempts: int = 3,
    compatibility_threshold: float = 90.0,
) -> JDScoredCompetencyUploadResponse:
    graph = build_jd_competency_graph()
    initial_state = JDCompetencyGraphState(
        jd_text=jd_text,
        max_attempts=max_attempts,
        compatibility_threshold=compatibility_threshold,
    )
    result = graph.invoke(initial_state.model_dump(), config={"recursion_limit": 150})
    final_state = JDCompetencyGraphState.model_validate(result)
    if final_state.final_output is None:
        raise ValueError("JD competency graph did not produce final_output")
    return final_state.final_output


def run_jd_competency_graph_agent_from_file(
    max_attempts: int = 3,
    compatibility_threshold: float = 90.0,
) -> JDScoredCompetencyUploadResponse:
    return run_jd_competency_graph_agent(
        load_jd_content(),
        max_attempts=max_attempts,
        compatibility_threshold=compatibility_threshold,
    )


_JD_NODE_PROGRESS_MESSAGES = {
    "extract_jd_competencies": "Extracting competencies from the JD",
    "select_current_jd_competency": "Selecting the next competency",
    "generate_jd_competency_combinations": "Generating sub-competencies",
    "verify_jd_competency_compatibility": "Checking JD compatibility",
    "accept_jd_competency_combination": "Accepting competency bundle",
    "select_top_jd_competency_items": "Selecting final competency rows",
}


def stream_jd_competency_graph_agent(
    jd_text: str,
    max_attempts: int = 3,
    compatibility_threshold: float = 90.0,
    should_cancel: Callable[[], bool] | None = None,
) -> Iterator[dict[str, Any]]:
    graph = build_jd_competency_graph()
    initial_state = JDCompetencyGraphState(
        jd_text=jd_text,
        max_attempts=max_attempts,
        compatibility_threshold=compatibility_threshold,
    )

    def cancel_requested() -> bool:
        return bool(should_cancel and should_cancel())
    
    def cancelled_event(last_completed_node: str) -> dict[str, Any]:
        return {
            "event": "cancelled",
            "data": {
                "message": "JD competency generation cancelled after the current LangGraph node.",
                "last_completed_node": last_completed_node,
                "competency": current_competency,
                "item_index": current_index,
                "total_items": total_competencies,
            },
        }
    
    current_competency = ""
    total_competencies = 0
    current_index = 0

    if cancel_requested():
        yield cancelled_event("before_start")
        return

    yield {
        "event": "started",
        "data": {
            "message": "Starting JD competency generation",
        },
    }

    if cancel_requested():
        yield cancelled_event("started")
        return

    for chunk in graph.stream(
        initial_state.model_dump(),
        config={"recursion_limit": 150},
        stream_mode="updates",
    ):
        for node_name, node_update in chunk.items():
            update = _dump_model_or_value(node_update)
            message = _JD_NODE_PROGRESS_MESSAGES.get(
                node_name,
                node_name.replace("_", " ").title(),
            )
            event_data: dict[str, Any] = {
                "node": node_name,
                "message": message,
            }

            if node_name == "extract_jd_competencies":
                competencies = (
                    (update.get("competency_extraction") or {}).get("competencies")
                    or []
                )
                total_competencies = len(competencies)
                event_data.update(
                    {
                        "total_items": total_competencies,
                        "item_index": 0,
                        "competency": "",
                        "detail": f"Found {total_competencies} competencies",
                    }
                )

            if node_name == "select_current_jd_competency":
                selected = update.get("current_competency") or {}
                current_competency = selected.get("name", "")
                current_index += 1
                event_data.update(
                    {
                        "total_items": total_competencies,
                        "item_index": current_index,
                        "competency": current_competency,
                        "detail": selected.get("definition", ""),
                    }
                )
                yield {"event": "progress", "data": event_data}
                if cancel_requested():
                    yield cancelled_event(node_name)
                    return
                continue

            if node_name == "generate_jd_competency_combinations":
                combination = update.get("current_combination") or {}
                sub_count = sum(
                    len(item.get("sub_competencies") or [])
                    for item in combination.get("combinations") or []
                )
                event_data.update(
                    {
                        "total_items": total_competencies,
                        "item_index": current_index,
                        "competency": current_competency,
                        "detail": f"Generated {sub_count} sub-competencies",
                    }
                )

            if node_name == "verify_jd_competency_compatibility":
                compatibility = update.get("current_compatibility") or {}
                score = compatibility.get("compatible_score")
                attempts = update.get("current_attempts")
                event_data.update(
                    {
                        "total_items": total_competencies,
                        "item_index": current_index,
                        "competency": current_competency,
                        "compatible_score": score,
                        "attempt": attempts,
                        "detail": f"Compatibility score: {score}",
                    }
                )

            if node_name == "accept_jd_competency_combination":
                accepted_list = update.get("combination_list") or []
                sub_count = 0
                if accepted_list:
                    sub_count = sum(
                        len(item.get("sub_competencies") or [])
                        for item in (accepted_list[0].get("combinations") or [])
                    )
                event_data.update(
                    {
                        "total_items": total_competencies,
                        "item_index": current_index,
                        "competency": current_competency,
                        "accepted_sub_competencies": sub_count,
                        "detail": f"Accepted {sub_count} sub-competencies",
                    }
                )

            if node_name == "select_top_jd_competency_items":
                final_output = update.get("final_output") or {}
                items = final_output.get("items") or []
                yield {
                    "event": "complete",
                    "data": {
                        "status": "completed",
                        "total_rows": len(items),
                        "items": items,
                    },
                }
                return

            yield {"event": "node", "data": event_data}
            if cancel_requested():
                yield cancelled_event(node_name)
                return


def stream_jd_competency_graph_agent_from_file(
    max_attempts: int = 3,
    compatibility_threshold: float = 90.0,
    should_cancel: Callable[[], bool] | None = None,
) -> Iterator[dict[str, Any]]:
    yield from stream_jd_competency_graph_agent(
        load_jd_content(),
        max_attempts=max_attempts,
        compatibility_threshold=compatibility_threshold,
        should_cancel=should_cancel,
    )


def decide_question_type_node(state: AgentInputState) -> NodeDecisionOutput:
    """
    First node in the LangGraph agent.
    Takes the experience level and list of competencies.
    Decides the type and number of questions (programming vs non-programming) for each sub-competency.
    Returns structured output.
    """
    node_config = _prompt_config["decide_question_type"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]

    # Prepare inputs for the prompt
    competencies_list = [comp.model_dump() for comp in state.competencies]
    user_prompt = user_prompt_template.format(
        experience_level=state.experience_level,
        competencies_json=json.dumps(competencies_list, indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt)
    ]

    structured_llm = llm.with_structured_output(NodeDecisionOutput)
    result: NodeDecisionOutput = structured_llm.invoke(messages)

    return result


def judge_decision_node(state: NodeDecisionOutput) -> NodeJudgeOutput:
    """
    Second node in the LangGraph agent (LLM Judge).
    Takes the proposed decisions from the first node.
    Evaluates them to ensure exact question counts and alignment with competencies.
    Returns structured output with approvals or revised counts.
    """
    node_config = _prompt_config["judge_decision"]
    llm = get_llm(node_config["model"])

    judge_system = node_config["system"]
    judge_user_template = node_config["user"]

    # Prepare inputs
    decisions_list = [decision.model_dump() for decision in state.decisions]
    user_prompt = judge_user_template.format(
        decisions_json=json.dumps(decisions_list, indent=2)
    )

    messages = [
        ("system", judge_system),
        ("user", user_prompt)
    ]

    structured_llm = llm.with_structured_output(NodeJudgeOutput)
    result: NodeJudgeOutput = structured_llm.invoke(messages)

    return result


def generate_business_scenarios_node(state: BusinessScenarioInputState) -> BusinessScenarioOutput:
    """
    Generates business scenarios for programming and non-programming questions.
    This function is written in node style so it can be converted into a LangGraph node later.
    """
    node_config = _prompt_config["generate_business_scenarios"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]

    scenario_decisions = [decision.model_dump() for decision in state.decisions]
    user_prompt = user_prompt_template.format(
        scenario_decisions_json=json.dumps(scenario_decisions, indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt)
    ]

    structured_llm = llm.with_structured_output(BusinessScenarioOutput)
    result: BusinessScenarioOutput = structured_llm.invoke(messages)

    return result


def validate_business_scenarios_node(
    state: BusinessScenarioValidationInputState,
) -> BusinessScenarioValidationOutput:
    """
    Validates generated business scenarios against competency, sub-competency, and question type.
    This function is written in node style so it can be converted into a LangGraph node later.
    """
    node_config = _prompt_config["validate_business_scenarios"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]

    business_scenarios = [scenario.model_dump() for scenario in state.scenarios]
    user_prompt = user_prompt_template.format(
        business_scenarios_json=json.dumps(business_scenarios, indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt)
    ]

    structured_llm = llm.with_structured_output(BusinessScenarioValidationOutput)
    result: BusinessScenarioValidationOutput = structured_llm.invoke(messages)

    return result


def generate_mcq_questions_node(state: MCQGenerationInputState) -> MCQGenerationOutput:
    """
    Generates one application-level MCQ for each business scenario.
    This function is written in node style so it can be converted into a LangGraph node later.
    """
    node_config = _prompt_config["generate_mcq_questions"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]

    business_scenarios = [scenario.model_dump() for scenario in state.scenarios]
    user_prompt = user_prompt_template.format(
        business_scenarios_json=json.dumps(business_scenarios, indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt)
    ]

    structured_llm = llm.with_structured_output(MCQGenerationOutput)
    result: MCQGenerationOutput = structured_llm.invoke(messages)

    return result


def regenerate_mcq_question(payload: RegenerateMCQInput) -> RegeneratedMCQQuestion:
    """
    Regenerates one MCQ using the same competency, sub-competency, question type,
    scenario, and code context as an existing generated row.
    """
    node_config = _prompt_config["regenerate_mcq_question"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    user_prompt = user_prompt_template.format(
        regenerate_question_json=json.dumps(payload.model_dump(), indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(RegeneratedMCQQuestion)
    result: RegeneratedMCQQuestion = structured_llm.invoke(messages)

    return result


def regenerate_mcq_question_with_feedback(payload: RegenerateMCQInputWithFeedback) -> RegeneratedMCQQuestionWithFeedback:
    """
    Regenerates one MCQ using the same scenario and explicit user feedback.
    """
    node_config = _prompt_config["regenerate_mcq_question_with_feedback"]
    llm = get_llm(node_config["model"])

    system_prompt = node_config["system"]
    user_prompt_template = node_config["user"]
    user_prompt = user_prompt_template.format(
        regenerate_question_json=json.dumps(payload.model_dump(), indent=2)
    )

    messages = [
        ("system", system_prompt),
        ("user", user_prompt),
    ]

    structured_llm = llm.with_structured_output(RegeneratedMCQQuestionWithFeedback)
    result: RegeneratedMCQQuestionWithFeedback = structured_llm.invoke(messages)

    return result


def _as_graph_state(state: Any) -> GraphState:
    if isinstance(state, GraphState):
        return state
    return GraphState.model_validate(state)


def _judge_decision_is_approved(judgement_output: NodeJudgeOutput | None) -> bool:
    if not judgement_output or not judgement_output.judgements:
        return False
    return all(
        judgement.is_approved and judgement.relevance_score >= 60
        for judgement in judgement_output.judgements
    )


def _business_scenarios_are_approved(validation_output: BusinessScenarioValidationOutput | None) -> bool:
    if not validation_output or not validation_output.validations:
        return False
    return all(validation.is_approved == "Yes" for validation in validation_output.validations)


def _collect_judge_feedback(judgement_output: NodeJudgeOutput) -> str:
    feedback = [
        judgement.feedback
        for judgement in judgement_output.judgements
        if not judgement.is_approved or judgement.relevance_score < 60
    ]
    return "\n".join(feedback) if feedback else "Not Applicable"


def _collect_scenario_feedback(validation_output: BusinessScenarioValidationOutput) -> str:
    feedback = [
        validation.feedback
        for validation in validation_output.validations
        if validation.is_approved != "Yes"
    ]
    return "\n".join(feedback) if feedback else "Not Applicable"


def _decide_question_type_graph_node(state: Any) -> dict:
    graph_state = _as_graph_state(state)
    item_feedback = graph_state.question_type_feedback or graph_state.item.feedback
    isolated_item = graph_state.item.model_copy(
        update={"feedback": item_feedback or "Not Applicable"}
    )
    decision = decide_question_type_node(
        AgentInputState(
            experience_level=graph_state.experience_level,
            competencies=[isolated_item],
        )
    )
    return {
        "question_type_decision": decision,
        "question_type_iterations": graph_state.question_type_iterations + 1,
    }


def _judge_question_type_graph_node(state: Any) -> dict:
    graph_state = _as_graph_state(state)
    if graph_state.question_type_decision is None:
        raise ValueError("question_type_decision is required before judging")

    judgement = judge_decision_node(graph_state.question_type_decision)
    return {
        "question_type_judgement": judgement,
        "question_type_feedback": _collect_judge_feedback(judgement),
    }


def _route_after_question_type_judge(state: Any) -> str:
    graph_state = _as_graph_state(state)
    if _judge_decision_is_approved(graph_state.question_type_judgement):
        return "generate_business_scenarios"
    if graph_state.question_type_iterations >= graph_state.max_question_type_iterations:
        raise ValueError("Question type decision was not approved within the retry limit")
    return "decide_question_type"


def _generate_business_scenarios_graph_node(state: Any) -> dict:
    graph_state = _as_graph_state(state)
    if graph_state.question_type_decision is None:
        raise ValueError("question_type_decision is required before scenario generation")

    scenario_feedback = graph_state.scenario_feedback or "Not Applicable"
    scenario_inputs = [
        BusinessScenarioInput(
            competency=decision.competency,
            sub_competency=decision.sub_competency,
            num_programming_questions=decision.num_programming_questions,
            num_non_programming_questions=decision.num_non_programming_questions,
            feedback=scenario_feedback,
        )
        for decision in graph_state.question_type_decision.decisions
    ]
    scenarios = generate_business_scenarios_node(
        BusinessScenarioInputState(decisions=scenario_inputs)
    )
    return {
        "business_scenarios": scenarios,
        "scenario_iterations": graph_state.scenario_iterations + 1,
    }


def _validate_business_scenarios_graph_node(state: Any) -> dict:
    graph_state = _as_graph_state(state)
    if graph_state.business_scenarios is None:
        raise ValueError("business_scenarios is required before validation")

    validations = validate_business_scenarios_node(
        BusinessScenarioValidationInputState(
            scenarios=graph_state.business_scenarios.scenarios
        )
    )
    return {
        "scenario_validations": validations,
        "scenario_feedback": _collect_scenario_feedback(validations),
    }


def _route_after_business_scenario_validation(state: Any) -> str:
    graph_state = _as_graph_state(state)
    if _business_scenarios_are_approved(graph_state.scenario_validations):
        return "generate_mcq_questions"
    if graph_state.scenario_iterations >= graph_state.max_scenario_iterations:
        raise ValueError("Business scenarios were not approved within the retry limit")
    return "generate_business_scenarios"


def _generate_mcq_questions_graph_node(state: Any) -> dict:
    graph_state = _as_graph_state(state)
    if graph_state.business_scenarios is None:
        raise ValueError("business_scenarios is required before MCQ generation")

    questions = generate_mcq_questions_node(
        MCQGenerationInputState(scenarios=graph_state.business_scenarios.scenarios)
    )
    return {"mcq_questions": questions}


def build_question_generation_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("decide_question_type", _decide_question_type_graph_node)
    workflow.add_node("judge_decision", _judge_question_type_graph_node)
    workflow.add_node("generate_business_scenarios", _generate_business_scenarios_graph_node)
    workflow.add_node("validate_business_scenarios", _validate_business_scenarios_graph_node)
    workflow.add_node("generate_mcq_questions", _generate_mcq_questions_graph_node)

    workflow.add_edge(START, "decide_question_type")
    workflow.add_edge("decide_question_type", "judge_decision")
    workflow.add_conditional_edges(
        "judge_decision",
        _route_after_question_type_judge,
        {
            "decide_question_type": "decide_question_type",
            "generate_business_scenarios": "generate_business_scenarios",
        },
    )
    workflow.add_edge("generate_business_scenarios", "validate_business_scenarios")
    workflow.add_conditional_edges(
        "validate_business_scenarios",
        _route_after_business_scenario_validation,
        {
            "generate_business_scenarios": "generate_business_scenarios",
            "generate_mcq_questions": "generate_mcq_questions",
        },
    )
    workflow.add_edge("generate_mcq_questions", END)

    return workflow.compile()


def run_question_generation_agent(
    payload: dict,
    experience_level: str = "mid senior",
    max_question_type_iterations: int = 3,
    max_scenario_iterations: int = 3,
) -> dict:
    graph = build_question_generation_graph()
    results = []

    for raw_item in payload.get("items", []):
        isolated_state = GraphState(
            item=SubCompetencyInput.model_validate(raw_item),
            experience_level=experience_level,
            max_question_type_iterations=max_question_type_iterations,
            max_scenario_iterations=max_scenario_iterations,
        )
        result = graph.invoke(isolated_state.model_dump(), config={"recursion_limit": 50})
        results.append(GraphState.model_validate(result).model_dump())

    return {"results": results}


_NODE_PROGRESS_MESSAGES = {
    "decide_question_type": "Deciding programming vs non-programming question mix",
    "judge_decision": "Validating the question type decision",
    "generate_business_scenarios": "Generating business scenarios",
    "validate_business_scenarios": "Validating business scenarios",
    "generate_mcq_questions": "Generating MCQ questions",
}


def _dump_model_or_value(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: _dump_model_or_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_dump_model_or_value(item) for item in value]
    return value


def stream_question_generation_agent(
    payload: dict,
    experience_level: str = "mid senior",
    max_question_type_iterations: int = 3,
    max_scenario_iterations: int = 3,
    should_cancel: Callable[[], bool] | None = None,
) -> Iterator[dict[str, Any]]:
    graph = build_question_generation_graph()
    items = payload.get("items", [])

    def cancel_requested() -> bool:
        return bool(should_cancel and should_cancel())
    

    for item_index, raw_item in enumerate(items, start=1):
        if cancel_requested():
            yield {
                "event": "cancelled",
                "data": {
                    "message": "Question generation cancelled before starting the next competency item.",
                    "item_index": item_index,
                    "total_items": len(items),
                },
            }
            return
        item = SubCompetencyInput.model_validate(raw_item)
        isolated_state = GraphState(
            item=item,
            experience_level=experience_level,
            max_question_type_iterations=max_question_type_iterations,
            max_scenario_iterations=max_scenario_iterations,
        )

        yield {
            "event": "item_started",
            "data": {
                "item_index": item_index,
                "total_items": len(items),
                "competency": item.competency,
                "sub_competency": item.sub_competency,
            },
        }

        for chunk in graph.stream(
            isolated_state.model_dump(),
            config={"recursion_limit": 50},
            stream_mode="updates",
        ):
            for node_name, node_update in chunk.items():
                update = _dump_model_or_value(node_update)
                yield {
                    "event": "node_completed",
                    "data": {
                        "item_index": item_index,
                        "total_items": len(items),
                        "competency": item.competency,
                        "sub_competency": item.sub_competency,
                        "node": node_name,
                        "message": _NODE_PROGRESS_MESSAGES.get(node_name, node_name.replace("_", " ").title()),
                    },
                }

                if node_name == "generate_mcq_questions":
                    questions = (update.get("mcq_questions") or {}).get("questions") or []
                    yield {
                        "event": "questions_generated",
                        "data": {
                            "item_index": item_index,
                            "total_items": len(items),
                            "competency": item.competency,
                            "sub_competency": item.sub_competency,
                            "questions": questions,
                        },
                    }

                if cancel_requested():
                    yield {
                        "event": "cancelled",
                        "data": {
                            "message": "Question generation cancelled during processing.",
                            "item_index": item_index,
                            "total_items": len(items),
                            "competency": item.competency,
                            "sub_competency": item.sub_competency,
                            "last_completed_node": node_name,
                        },
                    }
                    return
