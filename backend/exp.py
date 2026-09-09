import re

SEMANTIC_MAP = {
    "assessment": "assessment",
    "project": "project",
    "keep_learning": "keep_learning",
}


def augment_dsl(dsl: str, config: dict) -> str:
    """
    Adds semantic nodes to a roadmap DSL.

    Input DSL must NOT already contain semantic nodes.

    Config example:
    {
        "assessment": {
            "topic": True,
            "module": True,
            "chapter": False,
            "roadmap": True,
        },
        "project": {
            "topic": False,
            "module": False,
            "chapter": False,
            "roadmap": True,
        },
    }
    """

    lines = dsl.strip().splitlines()
    output = []

    in_topic = False
    in_module = False

    def emit_module_nodes():
        if not in_module:
            return

        for semantic, scopes in config.items():
            if scopes.get("module"):
                output.append(f"@m.{SEMANTIC_MAP[semantic]}")

    def emit_topic_nodes():
        if not in_topic:
            return

        for semantic, scopes in config.items():
            if scopes.get("topic"):
                output.append(f"@t.{SEMANTIC_MAP[semantic]}")

    for line in lines:

        # New Topic
        if line.startswith("## "):
            if in_module:
                emit_module_nodes()
                in_module = False

            if in_topic:
                emit_topic_nodes()

            in_topic = True

        # New Module
        elif line.startswith("### "):
            if in_module:
                emit_module_nodes()

            in_module = True

        output.append(line)

    # Flush last module
    if in_module:
        emit_module_nodes()

    # Flush last topic
    if in_topic:
        emit_topic_nodes()

    # Roadmap nodes
    for semantic, scopes in config.items():
        if scopes.get("roadmap"):
            output.append(f"@r.{SEMANTIC_MAP[semantic]}")

    return "\n".join(output)


SEMANTIC_MAP = {
    "assessment": "assessment",
    "project": "project",
    "keep_learning": "keep_learning",
}


def augment_dsl_v2(dsl: str, config: dict) -> str:
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
                output.append(
                    f"@{scope_prefix}.{SEMANTIC_MAP[semantic]}: {node_name}"
                )
            else:
                output.append(
                    f"@{scope_prefix}.{SEMANTIC_MAP[semantic]}"
                )

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

SEMANTIC_NODE_PATTERN = re.compile(
    r"^@(r|t|m)\.[a-zA-Z_]+(?:\s*:\s*.*)?$"
)


def deaugment_dsl_v2(dsl: str) -> str:
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


DSL = "# Principal Backend Engineer (Java) Roadmap\n## Advanced Java Language Features\n### Modern Java Constructs\n- Java 8+ Features (Lambdas, Streams, Optionals) [1]\n- Records and Pattern Matching [1]\n- Sealed Classes and Interfaces [2]\n- Virtual Threads (Project Loom) [1]\n### Concurrency and Parallelism\n- Advanced Concurrency Utilities (Executors, Fork/Join) [1]\n- Reactive Programming with Project Reactor/RxJava [2]\n- Non-blocking I/O (NIO.2) [2]\n## High-Performance Backend Systems\n### Performance Tuning and Profiling\n- JVM Internals and Memory Management [1]\n- Garbage Collection Tuning [1]\n- Java Profiling Tools (JFR, VisualVM, YourKit) [1]\n- Benchmarking with JMH [2]\n### Distributed Systems Patterns\n- Microservices Architecture Principles [1]\n- Event-Driven Architectures (Kafka, RabbitMQ) [1]\n- Distributed Caching (Redis, Hazelcast) [2]\n- API Gateway and Service Mesh Concepts [2]\n## Robust and Scalable Architectures\n### Design Patterns and Principles\n- Advanced Design Patterns (e.g., Saga, CQRS) [1]\n- SOLID Principles in Practice [1]\n- Domain-Driven Design (DDD) [2]\n- Clean Architecture and Hexagonal Architecture [2]\n### Database and Data Management\n- Advanced SQL and NoSQL Database Optimization [1]\n- ORM Deep Dive (Hibernate/JPA Performance) [1]\n- Data Consistency in Distributed Systems [2]\n- Polyglot Persistence Strategies [3]\n## Cloud-Native and DevOps\n### Cloud Platforms and Deployment\n- Containerization with Docker and Kubernetes [1]\n- Cloud Providers (AWS, Azure, GCP) for Java Apps [1]\n- Serverless Architectures (AWS Lambda, Azure Functions) [2]\n- Infrastructure as Code (Terraform) [3]\n### Observability and Reliability\n- Logging Best Practices (SLF4J, Logback) [1]\n- Monitoring and Alerting (Prometheus, Grafana) [1]\n- Tracing (OpenTelemetry, Jaeger) [2]\n- Chaos Engineering Principles [3]\n## Leadership and Mentorship\n### Technical Leadership\n- Code Review Best Practices [1]\n- Mentoring Junior Developers [2]\n- System Design Interview Preparation [1]\n- Architectural Decision Records (ADRs) [2]\n### Project Management and Best Practices\n- Agile Methodologies (Scrum, Kanban) [1]\n- Git Advanced Workflows [1]\n- CI/CD Pipelines (Jenkins, GitLab CI, GitHub Actions) [1]"

config = {
    'assessment': {
        'topic': False,
        'module': True,
        'chapter': True,
        'roadmap': False
    },
    'project': {
        'topic': False,
        'module': False,
        'chapter': False,
        'roadmap': True
    }
}

config_v2 = {
    "assessment": {
        "topic": {
            "enabled": False,
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


""" augmented_dsl = augment_dsl_v2(dsl=DSL, config=config_v2)
print(f"--------------------------------------------\n{augmented_dsl}\n----------------------------------------")

de_aug_dsl = deaugment_dsl_v2(dsl=augmented_dsl)
print(f"--------------------------------------------\n{de_aug_dsl}\n----------------------------------------") """


def build_topic_tree(nodes, edges):
    """
    Convert React Flow nodes/edges into:

    [
        {
            "module_name": "Topic 1",
            "chapters": [
                {
                    "chapter_name": "Module 1",
                    "subtopics": ["Subtopic 1", "Subtopic 2"]
                }
            ]
        }
    ]
    """

    # Convert nodes list into lookup by ID
    node_by_id = {node["id"]: node for node in nodes}

    # Find topic -> module relationships from edges
    topic_modules = {}

    for edge in edges:
        source_id = edge["source"]
        target_id = edge["target"]

        source = node_by_id.get(source_id)
        target = node_by_id.get(target_id)

        if not source or not target:
            continue

        # Adjust these type names if your ReactFlow types differ
        if source["type"] in ["topic", "topicGroup"] and target["type"] == "subtopicGroup":
            topic_modules.setdefault(source_id, []).append(target_id)

    result = []

    for topic_id, module_ids in topic_modules.items():
        topic_node = node_by_id[topic_id]

        topic_name = topic_node["data"].get("label", topic_node["data"].get("name"))

        modules = []

        for module_id in module_ids:
            module_node = node_by_id[module_id]

            module_name = module_node["data"].get(
                "label",
                module_node["data"].get("name")
            )

            # Find subtopics whose parentId is this module
            subtopics = []

            for node in nodes:
                if node.get("parentId") == module_id and node['type'] == 'subtopic':
                    subtopic_name = node["data"].get(
                        "label",
                        node["data"].get("name")
                    )

                    if subtopic_name is not None:
                        subtopics.append(subtopic_name)

            modules.append({
                "chapter_name":  re.sub(r"^\d+\.\s*", "", module_name),
                "subtopics": subtopics
            })

        result.append({
            "module_name": topic_name,
            "chapters": modules
        })

    return result


data = {
  "edges": [
    {
      "id": "xy_edge_ai__8B102270871042C8Eee5C9F07737cb52b__2c9E6BE2eC2FdAb172F0F1a727b2492Bt2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "8B102270871042C8Eee5C9F07737cb52",
      "target": "2c9E6BE2eC2FdAb172F0F1a727b2492B",
      "selected": False,
      "sourceHandle": "b",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__2c9E6BE2eC2FdAb172F0F1a727b2492Bb1__1daea1C195955f674a4E6D4FD133dC75t2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "2c9E6BE2eC2FdAb172F0F1a727b2492B",
      "target": "1daea1C195955f674a4E6D4FD133dC75",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__1daea1C195955f674a4E6D4FD133dC75b1__b4D1c005aE96dA37477180EC186788A6t2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "1daea1C195955f674a4E6D4FD133dC75",
      "target": "b4D1c005aE96dA37477180EC186788A6",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__b4D1c005aE96dA37477180EC186788A6b1__c428DA880fC275799d5dFbc94412D6B3t2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "b4D1c005aE96dA37477180EC186788A6",
      "target": "c428DA880fC275799d5dFbc94412D6B3",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__c428DA880fC275799d5dFbc94412D6B3b1__Ee7A057C5A1D037aDF50eE7D927a157dt2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "c428DA880fC275799d5dFbc94412D6B3",
      "target": "Ee7A057C5A1D037aDF50eE7D927a157d",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__Ee7A057C5A1D037aDF50eE7D927a157db1__Cf1361f3a37c2728022c9bCa2F2c1f4Ct2",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "Ee7A057C5A1D037aDF50eE7D927a157d",
      "target": "Cf1361f3a37c2728022c9bCa2F2c1f4C",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t2"
    },
    {
      "id": "xy_edge_ai__2c9E6BE2eC2FdAb172F0F1a727b2492Bl1__a2ceAb4BE876B9CA5654e00E3A5147CDr2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "2c9E6BE2eC2FdAb172F0F1a727b2492B",
      "target": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "selected": False,
      "sourceHandle": "l1",
      "targetHandle": "r2"
    },
    {
      "id": "xy_edge_ai__2c9E6BE2eC2FdAb172F0F1a727b2492Br1__8BF24D86e085D25afFE031820CfA7973l2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "2c9E6BE2eC2FdAb172F0F1a727b2492B",
      "target": "8BF24D86e085D25afFE031820CfA7973",
      "selected": False,
      "sourceHandle": "r1",
      "targetHandle": "l2"
    },
    {
      "id": "xy_edge_ai__1daea1C195955f674a4E6D4FD133dC75l1__090176a76efaCF8935661E84DBF2441Dr2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "1daea1C195955f674a4E6D4FD133dC75",
      "target": "090176a76efaCF8935661E84DBF2441D",
      "selected": False,
      "sourceHandle": "l1",
      "targetHandle": "r2"
    },
    {
      "id": "xy_edge_ai__1daea1C195955f674a4E6D4FD133dC75l1__dE8DDF3B947EADDc61A79ad3b6191E28r2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "1daea1C195955f674a4E6D4FD133dC75",
      "target": "dE8DDF3B947EADDc61A79ad3b6191E28",
      "selected": False,
      "sourceHandle": "l1",
      "targetHandle": "r2"
    },
    {
      "id": "xy_edge_ai__1daea1C195955f674a4E6D4FD133dC75r1__52D37492100aF69C2575DD9268E41c18l2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "1daea1C195955f674a4E6D4FD133dC75",
      "target": "52D37492100aF69C2575DD9268E41c18",
      "selected": False,
      "sourceHandle": "r1",
      "targetHandle": "l2"
    },
    {
      "id": "xy_edge_ai__b4D1c005aE96dA37477180EC186788A6l1__FdcFD46645ebD71473C7496B16EeDe70r2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "b4D1c005aE96dA37477180EC186788A6",
      "target": "FdcFD46645ebD71473C7496B16EeDe70",
      "selected": False,
      "sourceHandle": "l1",
      "targetHandle": "r2"
    },
    {
      "id": "xy_edge_ai__b4D1c005aE96dA37477180EC186788A6r1__bec47ACAcac40AdC0F55CB40D05475A3l2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "b4D1c005aE96dA37477180EC186788A6",
      "target": "bec47ACAcac40AdC0F55CB40D05475A3",
      "selected": False,
      "sourceHandle": "r1",
      "targetHandle": "l2"
    },
    {
      "id": "xy_edge_ai__c428DA880fC275799d5dFbc94412D6B3l1__c51388ca9a87c0c4056aa51EFeD58dB7r2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "c428DA880fC275799d5dFbc94412D6B3",
      "target": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "selected": False,
      "sourceHandle": "l1",
      "targetHandle": "r2"
    },
    {
      "id": "xy_edge_ai__c428DA880fC275799d5dFbc94412D6B3r1__8560a62f72E641c5ed4a0D1EC78185e3l2",
      "type": "default",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "0"
      },
      "source": "c428DA880fC275799d5dFbc94412D6B3",
      "target": "8560a62f72E641c5ed4a0D1EC78185e3",
      "selected": False,
      "sourceHandle": "r1",
      "targetHandle": "l2"
    },
    {
      "id": "xy_edge_ai__Cf1361f3a37c2728022c9bCa2F2c1f4Cb1__f485704021825b36A19fb3819d8011Dbt",
      "type": "straight",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2,
        "strokeDasharray": "15 15"
      },
      "source": "Cf1361f3a37c2728022c9bCa2F2c1f4C",
      "target": "f485704021825b36A19fb3819d8011Db",
      "selected": False,
      "sourceHandle": "b1",
      "targetHandle": "t"
    }
  ],
  "nodes": [
    {
      "id": "8B102270871042C8Eee5C9F07737cb52",
      "data": {
        "label": "Advanced Java for Python Developers",
        "style": {
          "color": "#ffffff",
          "width": 850,
          "height": 150,
          "fontSize": "44px",
          "backgroundColor": "#cd0100"
        },
        "convertible": False
      },
      "type": "title",
      "style": {
        "width": 850,
        "height": 150
      },
      "measured": {
        "width": 850,
        "height": 150
      },
      "position": {
        "x": -150,
        "y": 0
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "2c9E6BE2eC2FdAb172F0F1a727b2492B",
      "data": {
        "label": "Java Fundamentals",
        "style": {
          "color": "#ffffff",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#1849D6"
        },
        "prevType": "topicGroup",
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "fontSize": "32px",
          "backgroundColor": "#1849D6"
        }
      },
      "type": "topic",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 600
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "data": {
        "label": "1. Core Language Constructs",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 781
      },
      "height": 781,
      "measured": {
        "width": 750,
        "height": 781
      },
      "position": {
        "x": -1100,
        "y": 600
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "c308f25b7D664fFEa450B83db76B25c3",
      "data": {
        "label": "Java Syntax and Basic Data Types",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "901a8938F5b8927C6E2E127e78815Fa9",
      "data": {
        "label": "Control Flow and Operators",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "F007143ffADd15C3A0D549Badc15b7B3",
      "data": {
        "label": "Object-Oriented Programming (OOP) in Java",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "c3aF921BB9371506FaA33196857EaDa4",
      "data": {
        "label": "Memory Management and Garbage Collection",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "position": {
        "x": 37.5,
        "y": 457
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "43524A026F71935D6B7A981e19cEc966",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "a2ceAb4BE876B9CA5654e00E3A5147CD",
      "position": {
        "x": 37.5,
        "y": 600
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "8BF24D86e085D25afFE031820CfA7973",
      "data": {
        "label": "2. Essential Java APIs",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 596
      },
      "height": 596,
      "measured": {
        "width": 750,
        "height": 596
      },
      "position": {
        "x": 900,
        "y": 600
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "9E41E5b9AA6448D706afD43899513321",
      "data": {
        "label": "String Handling and Utility Classes",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8BF24D86e085D25afFE031820CfA7973",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "51EC05e5B4211f3bFfc323818489Eaf8",
      "data": {
        "label": "Collections Framework (List, Set, Map)",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8BF24D86e085D25afFE031820CfA7973",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "5599caB51c0Ad93D3635056Fee566f1e",
      "data": {
        "label": "Exception Handling",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8BF24D86e085D25afFE031820CfA7973",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "7ACD79Fb7468acF5241B637a5423f6F4",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8BF24D86e085D25afFE031820CfA7973",
      "position": {
        "x": 37.5,
        "y": 415
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "1daea1C195955f674a4E6D4FD133dC75",
      "data": {
        "label": "Advanced Java Concepts",
        "style": {
          "color": "#ffffff",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#1849D6"
        },
        "prevType": "topicGroup",
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "fontSize": "32px",
          "backgroundColor": "#1849D6"
        }
      },
      "type": "topic",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 1441
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "090176a76efaCF8935661E84DBF2441D",
      "data": {
        "label": "3. Concurrency and Multithreading",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 495
      },
      "height": 495,
      "measured": {
        "width": 750,
        "height": 495
      },
      "position": {
        "x": -1100,
        "y": 1441
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "06985C65CdEC6CC6bAf677C158c7980D",
      "data": {
        "label": "Threads and Runnables",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "090176a76efaCF8935661E84DBF2441D",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "D2534FDfdC1eBBB52a1B5a19227E1691",
      "data": {
        "label": "Concurrency Utilities",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "090176a76efaCF8935661E84DBF2441D",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "DFB1E75E1229DBC231c9385AFc12C863",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "090176a76efaCF8935661E84DBF2441D",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "dE8DDF3B947EADDc61A79ad3b6191E28",
      "data": {
        "label": "4. I/O and Networking",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 495
      },
      "height": 495,
      "measured": {
        "width": 750,
        "height": 495
      },
      "position": {
        "x": -1100,
        "y": 2016
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "0Be3b295740C36EA1fB85Fb8D400AC3e",
      "data": {
        "label": "File I/O Operations",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "dE8DDF3B947EADDc61A79ad3b6191E28",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "fE1f0B80a3579cA17957504D012B322b",
      "data": {
        "label": "Basic Networking with Sockets",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#0AB81F",
          "backgroundColor": "#7DCE7980"
        },
        "knl_type": "suggested_learning",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "dE8DDF3B947EADDc61A79ad3b6191E28",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "F4A0c0a43Cd2D41AFe2733934616555E",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "dE8DDF3B947EADDc61A79ad3b6191E28",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "52D37492100aF69C2575DD9268E41c18",
      "data": {
        "label": "5. Modern Java Features",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 495
      },
      "height": 495,
      "measured": {
        "width": 750,
        "height": 495
      },
      "position": {
        "x": 900,
        "y": 1441
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "0Cac01e684b75654811485D740936E5E",
      "data": {
        "label": "Lambda Expressions and Streams",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "52D37492100aF69C2575DD9268E41c18",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "f1F40EAa97742B75D831196aA2C1a715",
      "data": {
        "label": "Modules and Project Jigsaw",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#0AB81F",
          "backgroundColor": "#7DCE7980"
        },
        "knl_type": "suggested_learning",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "52D37492100aF69C2575DD9268E41c18",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "bBCFB5D176032cd94f129F4b1D4848f3",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "52D37492100aF69C2575DD9268E41c18",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "b4D1c005aE96dA37477180EC186788A6",
      "data": {
        "label": "Data Analytics in Python",
        "style": {
          "color": "#ffffff",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#1849D6"
        },
        "prevType": "topicGroup",
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "fontSize": "32px",
          "backgroundColor": "#1849D6"
        }
      },
      "type": "topic",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 2571
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "FdcFD46645ebD71473C7496B16EeDe70",
      "data": {
        "label": "6. Core Libraries for Data Analysis",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 680
      },
      "height": 680,
      "measured": {
        "width": 750,
        "height": 680
      },
      "position": {
        "x": -1100,
        "y": 2571
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "baB94d664146eAdB27d1eB27bA3B11aB",
      "data": {
        "label": "NumPy for numerical operations",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "FdcFD46645ebD71473C7496B16EeDe70",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "de6363A90EdC30d01E08EEDF22294897",
      "data": {
        "label": "Pandas for data manipulation and analysis",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "FdcFD46645ebD71473C7496B16EeDe70",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "c643489c8b44e6C386eC816A53625714",
      "data": {
        "label": "Matplotlib and Seaborn for data visualization",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "FdcFD46645ebD71473C7496B16EeDe70",
      "position": {
        "x": 37.5,
        "y": 356
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "6f5377aC2cbd11678387Fae05d4a2079",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "FdcFD46645ebD71473C7496B16EeDe70",
      "position": {
        "x": 37.5,
        "y": 499
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "bec47ACAcac40AdC0F55CB40D05475A3",
      "data": {
        "label": "7. Advanced Data Analytics Techniques",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 638
      },
      "height": 638,
      "measured": {
        "width": 750,
        "height": 638
      },
      "position": {
        "x": 900,
        "y": 2571
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "50c6817C1aD67Bf3075a32F43BBC2252",
      "data": {
        "label": "Statistical analysis with SciPy",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "bec47ACAcac40AdC0F55CB40D05475A3",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "593bF5E4B6e999d131B67E703bFB716E",
      "data": {
        "label": "Machine Learning basics with Scikit-learn",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "bec47ACAcac40AdC0F55CB40D05475A3",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "01e7D6B30F684af7b1504e5B324BF815",
      "data": {
        "label": "Time Series Analysis",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#0AB81F",
          "backgroundColor": "#7DCE7980"
        },
        "knl_type": "suggested_learning",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "bec47ACAcac40AdC0F55CB40D05475A3",
      "position": {
        "x": 37.5,
        "y": 356
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "cfEdcbe0942DC0ad460Eab586B0dd949",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "bec47ACAcac40AdC0F55CB40D05475A3",
      "position": {
        "x": 37.5,
        "y": 457
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "c428DA880fC275799d5dFbc94412D6B3",
      "data": {
        "label": "Google Specific Technologies",
        "style": {
          "color": "#ffffff",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#1849D6"
        },
        "prevType": "topicGroup",
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "fontSize": "32px",
          "backgroundColor": "#1849D6"
        }
      },
      "type": "topic",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 3311
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "data": {
        "label": "8. Google Cloud Platform (GCP) Fundamentals",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 596
      },
      "height": 596,
      "measured": {
        "width": 750,
        "height": 596
      },
      "position": {
        "x": -1100,
        "y": 3311
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "6B280709826deb4d5AfA46aCa25DC746",
      "data": {
        "label": "Introduction to GCP Services",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FF4C4C",
          "backgroundColor": "#FF4C4C30"
        },
        "knl_type": "must_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "d3925427d9128340f0835Ca6D3bB3Ae5",
      "data": {
        "label": "Compute Engine and Cloud Storage",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "9dFBa0243F9A285C784c637882CEF324",
      "data": {
        "label": "BigQuery for Data Warehousing",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "position": {
        "x": 37.5,
        "y": 314
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "4FA0153C68470f1164e3d77d5efF8e2c",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "c51388ca9a87c0c4056aa51EFeD58dB7",
      "position": {
        "x": 37.5,
        "y": 415
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "8560a62f72E641c5ed4a0D1EC78185e3",
      "data": {
        "label": "9. Advanced Google Technologies",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#BEBEBE",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "headerStyle": {
          "color": "#ffffff",
          "height": 82,
          "fontSize": "32px",
          "backgroundColor": "#313030"
        }
      },
      "type": "subtopicGroup",
      "style": {
        "width": 750,
        "height": 680
      },
      "height": 680,
      "measured": {
        "width": 750,
        "height": 680
      },
      "position": {
        "x": 900,
        "y": 3311
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "ec6088cf99509337C783F2b4b3978B63",
      "data": {
        "label": "TensorFlow for Machine Learning",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#FFC727",
          "backgroundColor": "#FFC72780"
        },
        "knl_type": "good_to_know",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8560a62f72E641c5ed4a0D1EC78185e3",
      "position": {
        "x": 37.5,
        "y": 112
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "8a6Ab2ef4D7d8b48C663bbFe42F0576C",
      "data": {
        "label": "Kubernetes Engine for Container Orchestration",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#0AB81F",
          "backgroundColor": "#7DCE7980"
        },
        "knl_type": "suggested_learning",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "8560a62f72E641c5ed4a0D1EC78185e3",
      "position": {
        "x": 37.5,
        "y": 213
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "ac3dBc613C43bd28EC750B6A5ABe3c20",
      "data": {
        "label": "Google App Engine for Scalable Applications",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#0AB81F",
          "backgroundColor": "#7DCE7980"
        },
        "knl_type": "suggested_learning",
        "convertible": False
      },
      "type": "subtopic",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 118
      },
      "parentId": "8560a62f72E641c5ed4a0D1EC78185e3",
      "position": {
        "x": 37.5,
        "y": 356
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "FfB228e6117a590531a927aEa48E4154",
      "data": {
        "label": "Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "m"
      },
      "type": "assignmentNode",
      "style": {
        "width": 675
      },
      "extent": "parent",
      "measured": {
        "width": 675,
        "height": 76
      },
      "parentId": "8560a62f72E641c5ed4a0D1EC78185e3",
      "position": {
        "x": 37.5,
        "y": 499
      },
      "selected": False,
      "draggable": True,
      "connectable": True
    },
    {
      "id": "Ee7A057C5A1D037aDF50eE7D927a157d",
      "data": {
        "label": "Final Assessment",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "assessment",
        "semanticScope": "r"
      },
      "type": "assignmentNode",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 4051
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "Cf1361f3a37c2728022c9bCa2F2c1f4C",
      "data": {
        "label": "Capstone Project",
        "style": {
          "color": "#000000",
          "fontSize": "32px",
          "borderColor": "#000000",
          "backgroundColor": "#ffffff"
        },
        "convertible": False,
        "semanticType": "project",
        "semanticScope": "r"
      },
      "type": "assignmentNode",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 4600
      },
      "selected": False,
      "draggable": True
    },
    {
      "id": "f485704021825b36A19fb3819d8011Db",
      "data": {
        "label": "Keep Learning . . .",
        "style": {
          "color": "#000000",
          "width": 550,
          "height": 150,
          "fontSize": "44px",
          "fontFamily": "cursive",
          "borderColor": "#000000",
          "backgroundColor": "#FFFFFF"
        },
        "convertible": False
      },
      "type": "learningAnchor",
      "style": {
        "width": 550,
        "height": 150
      },
      "measured": {
        "width": 550,
        "height": 150
      },
      "position": {
        "x": 0,
        "y": 5400
      },
      "selected": False,
      "draggable": True
    }
  ],
  "viewport": {
    "x": 713,
    "y": -167,
    "zoom": 0.2
  }
}

print(build_topic_tree(nodes=data['nodes'], edges=data['edges']))