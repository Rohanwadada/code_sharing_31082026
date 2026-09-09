import re

SEMANTIC_MAP = {
    "assessment": "assessment",
    "project": "project",
    "keep_learning": "keep_learning",
}

SEMANTIC_NODE_PATTERN = re.compile(r"^@(r|t|m)\.[a-zA-Z_]+(?:\s*:\s*.*)?$")

config = {
    "assessment": {
        "topic": {
            "enabled": False,
            "name": "Assessment",
        },
        "module": {
            "enabled": True,
            "name": "Assessment",
        },
        "chapter": {
            "enabled": False,
            "name": "",
        },
        "roadmap": {
            "enabled": True,
            "name": "Final Assessment",
        },
    },
    "project": {
        "topic": {
            "enabled": False,
            "name": "",
        },
        "module": {
            "enabled": False,
            "name": "",
        },
        "chapter": {
            "enabled": False,
            "name": "",
        },
        "roadmap": {
            "enabled": True,
            "name": "Capstone Project",
        },
    },
}


def augment_dsl(dsl: str, config: dict = config) -> str:
    """
    Adds semantic nodes to a roadmap DSL.

    Example config:

    config = {
        "assessment": {
            "topic": {
                "enabled": True,
                "name": "Assessment",
            },
            "module": {
                "enabled": True,
                "name": "Module Assessment",
            },
            "chapter": {
                "enabled": False,
                "name": "",
            },
            "roadmap": {
                "enabled": True,
                "name": "Final Assessment",
            },
        },
        "project": {
            "topic": {
                "enabled": False,
                "name": "",
            },
            "module": {
                "enabled": False,
                "name": "",
            },
            "chapter": {
                "enabled": False,
                "name": "",
            },
            "roadmap": {
                "enabled": True,
                "name": "Capstone Project",
            },
        },
    }
    """

    lines = dsl.strip().splitlines()
    output = []

    in_topic = False
    in_module = False

    def emit(scope_key: str, scope_prefix: str):
        for semantic, scopes in config.items():
            scope_cfg = scopes.get(scope_key, {})

            if not scope_cfg.get("enabled", False):
                continue

            node_name = scope_cfg.get("name", "").strip()

            if node_name:
                output.append(f"@{scope_prefix}.{SEMANTIC_MAP[semantic]}: {node_name}")
            else:
                output.append(f"@{scope_prefix}.{SEMANTIC_MAP[semantic]}")

    for line in lines:
        # New Topic
        if line.startswith("## "):
            if in_module:
                emit("module", "m")
                in_module = False

            if in_topic:
                emit("topic", "t")

            in_topic = True

        # New Module
        elif line.startswith("### "):
            if in_module:
                emit("module", "m")

            in_module = True

        output.append(line)

    # Flush last module
    if in_module:
        emit("module", "m")

    # Flush last topic
    if in_topic:
        emit("topic", "t")

    # Roadmap nodes
    emit("roadmap", "r")

    return "\n".join(output)


def deaugment_dsl(dsl: str) -> str:
    """
    Removes all semantic nodes from an augmented roadmap DSL.

    Removes nodes such as:

        @t.assessment: Assessment
        @m.assessment: Module Assessment
        @r.assessment: Final Assessment
        @r.project: Capstone Project
        @t.keep_learning

    and preserves the original roadmap DSL.

    The function is config-independent because semantic nodes are
    identifiable by their DSL syntax.
    """

    lines = dsl.strip().splitlines()

    output = []

    for line in lines:
        line = line.rstrip()

        if SEMANTIC_NODE_PATTERN.match(line):
            continue

        output.append(line)

    return "\n".join(output)
