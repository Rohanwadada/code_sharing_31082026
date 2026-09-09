from dataclasses import dataclass

from modules.artifact.service import ArtifactService
from modules.thread.service import ThreadService


@dataclass
class GraphContext:
    thread_service: ThreadService
    artifact_service: ArtifactService
