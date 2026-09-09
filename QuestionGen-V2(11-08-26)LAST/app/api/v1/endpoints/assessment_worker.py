import asyncio
import json
import threading
import uuid
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, PrivateAttr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.project_service import get_project_by_id_async
from app.models.competency import CompetencyGenerateResponse
from app.ai.tasks.agent_implementation import (
    stream_question_generation_agent,
    stream_jd_competency_graph_agent
)

router = APIRouter(tags=["AI Worker"])

JobStatus = Literal["queued", "running", "cancelling", "cancelled", "completed", "failed"]

class GenerationJob(BaseModel):
    job_id: str
    status: JobStatus = "queued"
    events: list[dict[str, Any]] = Field(default_factory=list)
    cancel_requested: bool = False
    error: str | None = None
    _lock: threading.Lock = PrivateAttr(default_factory=threading.Lock)

    def add_event(self, event: str, data: dict):
        with self._lock:
            self.events.append({"event": event, "data": data})

    def snapshot_from(self, index: int):
        with self._lock:
            return self.events[index:]

    def mark_running(self) -> bool:
        with self._lock:
            if self.status != "queued":
                return False
            self.status = "running"
            return True

    def is_cancel_requested(self) -> bool:
        with self._lock:
            return self.cancel_requested

    def mark_cancelled(self) -> None:
        with self._lock:
            self.status = "cancelled"

    def mark_completed(self) -> bool:
        with self._lock:
            if self.status == "cancelled":
                return False
            self.status = "completed"
            return True

    def mark_failed(self, error: str) -> bool:
        with self._lock:
            if self.status == "cancelled":
                return False
            self.status = "failed"
            self.error = error
            return True


_jobs: dict[str, GenerationJob] = {}


def _get_job(job_id: str) -> GenerationJob | None:
    return _jobs.get(job_id)


def _format_sse(event_name: str, data: dict[str, Any]) -> str:
    """Helper method to format Server-Sent Events"""
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"


def _run_ai_agent(job: GenerationJob, payload: dict):
    """Runs the LangGraph AI in the background so it doesn't freeze the API."""
    job.mark_running()
    job.add_event("started", {
        "job_id": job.job_id, 
        "status": job.status,
        "step": 1,
        "progress_percentage": 0
    })
    
    format_type = payload.get("assessment_config", {}).get("format_type", "static")
    shuffle = payload.get("assessment_config", {}).get("shuffle_per_candidate", False)
    
    id_map = {}
    for item in payload.get("items", []):
        c_name = item.get("competency")
        sc_name = item.get("sub_competency")
        if c_name and sc_name:
            id_map[(c_name, sc_name)] = {
                "competency_id": item.get("competency_id"),
                "subcompetency_id": item.get("subcompetency_id")
            }
            
    row_number = 1
    total_questions = 0

    try:
        for stream_event in stream_question_generation_agent(payload, should_cancel=job.is_cancel_requested):
            event_name = stream_event["event"]
            event_data = {
                "job_id": job.job_id,
                "status": job.status,
                **stream_event.get("data", {})
            }

            idx = event_data.get("item_index", 0)
            tot = event_data.get("total_items", 1)

            try:
                calculated_step = min(5, max(1, int((idx / tot) * 5) + 1))
                calculated_progress = min(99, int((idx / tot) * 100))
            except (ZeroDivisionError, TypeError):
                calculated_step = 1
                calculated_progress = 0

            event_data["step"] = calculated_step
            event_data["progress_percentage"] = calculated_progress

            if event_name == "item_started":
                event_data["node"] = stream_event.get("node", "processing_item")
                comp = event_data.get("competency", "")
                sub_comp = event_data.get("sub_competency", "")
                
                event_data["message"] = stream_event.get("message", f"Generating questions for {comp} - {sub_comp} ({idx}/{tot})")
                
                job.add_event("progress", event_data)
                continue
                
            if event_name == "node_completed":
                job.add_event("node", event_data)
                continue

            if event_name == "questions_generated":
                for q in event_data.get("questions", []):
                    q["id"] = str(uuid.uuid4())
                    q["row_number"] = row_number
                    q["regeneration_limit"] = 2
                    q["assessment_format"] = format_type
                    q["shuffle_per_candidate"] = shuffle
                    
                    c_name = q.get("competency")
                    sc_name = q.get("sub_competency")
                    ids = id_map.get((c_name, sc_name), {})
                    q["competency_id"] = ids.get("competency_id")
                    q["subcompetency_id"] = ids.get("subcompetency_id")
                    
                    job.add_event("row", q)
                    row_number += 1
                    total_questions += 1
                continue
                
            if event_name == "cancelled":
                job.mark_cancelled()
                event_data["status"] = job.status
                event_data["total_rows"] = total_questions
                job.add_event("cancelled", event_data)
                return

        if job.mark_completed():
            job.add_event("complete", {
                "job_id": job.job_id, 
                "status": job.status, 
                "total_rows": total_questions,
                "step": 5,
                "progress_percentage": 100,
                "message": "Generation completed successfully."
            })

    # Protects the stream from crashing if the client disconnects
    except ConnectionAbortedError:
        print(f"Connection aborted for job {job.job_id}. Client disconnected.")
        job.mark_cancelled()
            
    except Exception as exc:
        if job.mark_failed(str(exc)):
            job.add_event("failed", {
                "job_id": job.job_id,
                "status": job.status,
                "error": job.error
            })


def _run_jd_competency_job(job: GenerationJob, jd_text: str) -> None:
    job.mark_running()
    
    rows_ready = 0
    total_competencies = 0
    current_ui_step = 1
    current_progress = 10
    
    job.add_event("started", {
        "job_id": job.job_id, 
        "status": job.status, 
        "message": "JD Reading: Initializing and parsing project details...",
        "step": current_ui_step,
        "progress_percentage": current_progress,
        "rows_ready": rows_ready
    })
    
    try:
        for stream_event in stream_jd_competency_graph_agent(jd_text=jd_text, should_cancel=job.is_cancel_requested):
            event_name = stream_event["event"]
            event_data = {
                "job_id": job.job_id, 
                "status": job.status,
                **stream_event.get("data", {})
            }
            
            idx = event_data.get("item_index", 1)
            tot = event_data.get("total_items", 1)
            total_competencies = tot if tot > 0 else 1

            current_node = event_data.get("node", "")

            if current_node == "extract_jd_competencies":
                current_ui_step = 1
                current_progress = 15
                event_data["message"] = "JD Reading: Analyzing Job Description..."

            elif current_node == "select_current_jd_competency":
                current_ui_step = 2
                current_progress = 15 + int(((idx - 0.8) / total_competencies) * 75)
                event_data["message"] = f"Select Competency: Identifying core competencies... ({idx}/{tot})"
                
            elif current_node == "generate_jd_competency_combinations":
                current_ui_step = 3
                current_progress = 15 + int(((idx - 0.5) / total_competencies) * 75)
                event_data["message"] = f"Sub-competencies: Generating detailed sub-competencies... ({idx}/{tot})"

            elif current_node == "verify_jd_competency_compatibility":
                current_ui_step = 4
                current_progress = 15 + int(((idx - 0.2) / total_competencies) * 75)
                attempt = event_data.get("attempt", 1)
                msg_append = f" (Attempt {attempt})" if attempt > 1 else ""
                event_data["message"] = f"Compatibility: Checking alignment and formatting... ({idx}/{tot}){msg_append}"
                
            elif current_node == "accept_jd_competency_combination":
                current_ui_step = 5
                current_progress = 15 + int((idx / total_competencies) * 75)
                event_data["message"] = f"Accept Bundle: Packaging finalized competencies... ({idx}/{tot})"
                
                sub_count = event_data.get("accepted_sub_competencies", 0)
                rows_ready += int(sub_count)
                
            elif current_node == "select_top_jd_competency_items":
                current_ui_step = 6
                current_progress = 95
                event_data["message"] = "Final Rows: Preparing final output..."

            if event_name == "complete":
                current_ui_step = 6
                current_progress = 100
                if "total_rows" in event_data:
                    rows_ready = event_data["total_rows"]
                event_data["message"] = "Generation Complete: All rows are ready."

            event_data["step"] = current_ui_step
            event_data["progress_percentage"] = current_progress
            event_data["rows_ready"] = rows_ready
            event_data["total_competencies"] = total_competencies

            if event_name == "started":
                job.add_event("started", event_data)
                continue
            
            if event_name in ["progress", "node"]:
                job.add_event("progress", event_data)
                continue

            if event_name == "complete":
                if job.mark_completed():
                    event_data["status"] = job.status
                    job.add_event("complete", event_data)
                return
            
            if event_name == "cancelled":
                job.mark_cancelled()
                event_data["status"] = job.status
                job.add_event("cancelled", event_data)
                return
            
        if job.mark_failed("JD competency generation ended without a completion or cancellation event."):
            job.add_event("failed", {"job_id": job.job_id, "status": job.status, "error": job.error})
            
    except ConnectionAbortedError:
        print(f"Connection aborted for job {job.job_id}. Client disconnected.")
        job.mark_cancelled()
        job.add_event("cancelled", {"job_id": job.job_id, "status": "cancelled", "message": "Client disconnected."})
        
    except Exception as exc:
        if job.mark_failed(str(exc)):
            job.add_event("failed", {"job_id": job.job_id, "status": job.status, "error": job.error})
            
# --- Endpoints ---

@router.post("/ai/generate")
async def trigger_generation(payload: dict):
    """
    API 1: Frontend calls this to start the job. 
    Returns immediately with a job_id.
    """
    job = GenerationJob(job_id=str(uuid.uuid4()))
    _jobs[job.job_id] = job
    
    threading.Thread(target=_run_ai_agent, args=(job, payload), daemon=True).start()
    
    return {"job_id": job.job_id, "status": job.status}


@router.get("/assessment/stream")
async def stream_generated_questions(job_id: str = Query(..., description="Generation job id")):
    """
    API 2: Frontend connects here via EventSource/Fetch to watch progress live.
    """
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    async def event_generator():
        event_index = 0
        while True:
            events = job.snapshot_from(event_index)
            for event in events:
                yield _format_sse(event["event"], event["data"])
                event_index += 1
                
            if job.status in {"completed", "failed", "cancelled"} and not job.snapshot_from(event_index):
                break
                
            yield _format_sse("heartbeat", {"job_id": job.job_id, "status": job.status})
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
    )


@router.post("/competency/jd/generate/{project_id}", response_model=CompetencyGenerateResponse)
async def generate_jd_competency_table(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_id_async(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project_details = project.get("project_details", {})
    jd_data = project_details.get("jd_data") if project_details else None
    
    if not jd_data:
        raise HTTPException(status_code=400, detail="No JD data found for this project")

    job = GenerationJob(job_id=str(uuid.uuid4()))
    _jobs[job.job_id] = job
    
    threading.Thread(target=_run_jd_competency_job, args=(job, jd_data), daemon=True).start()
    
    return CompetencyGenerateResponse(job_id=job.job_id, status=job.status)


@router.get("/competency/jd/stream")
async def stream_jd_competency_table(job_id: str = Query(..., description="JD competency generation job id")):
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="JD competency generation job not found.")

    async def event_generator():
        event_index = 0
        while True:
            events = job.snapshot_from(event_index)
            for event in events:
                yield _format_sse(event["event"], event["data"])
                event_index += 1
            if job.status in {"completed", "failed", "cancelled"} and not job.snapshot_from(event_index):
                break
            yield _format_sse("heartbeat", {"job_id": job.job_id, "status": job.status})
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream", 
        headers={
            "Cache-Control": "no-cache", 
            "Connection": "keep-alive", 
            "X-Accel-Buffering": "no"
        }
    )