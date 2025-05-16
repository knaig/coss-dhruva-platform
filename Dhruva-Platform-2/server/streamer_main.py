from fastapi import FastAPI, HTTPException
from seq_streamer import StreamingServerTaskSequence, TaskPipelineManager
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

app = FastAPI()
streamer = StreamingServerTaskSequence()
# Mount it at the default path of SocketIO engine
app.mount("/socket.io", streamer.app)

# Create a separate pipeline manager instance for API endpoints
pipeline_manager = TaskPipelineManager()

class TaskConfig(BaseModel):
    taskType: str
    config: Dict[str, Any]

class PipelineConfig(BaseModel):
    pipeline_id: str
    task_sequence: List[TaskConfig]

@app.post("/pipelines")
async def create_pipeline(pipeline: PipelineConfig):
    """Create a new pipeline with a sequence of tasks"""
    try:
        pipeline_manager.create_pipeline(pipeline.pipeline_id, pipeline.task_sequence)
        return {"status": "success", "pipeline_id": pipeline.pipeline_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get a pipeline configuration"""
    pipeline = pipeline_manager.get_pipeline(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"pipeline_id": pipeline_id, "task_sequence": pipeline}

@app.post("/tasks")
async def register_task(task_id: str, task_config: Dict[str, Any]):
    """Register a new task type"""
    try:
        pipeline_manager.register_task(task_id, task_config)
        return {"status": "success", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/tasks")
async def list_tasks():
    """List all available task types"""
    return {"tasks": pipeline_manager.available_tasks}

## TEMPORARY ##

# TODO: Depreciate this soon in-favor of above
from asr_streamer import StreamingServerASR
streamer_asr = StreamingServerASR()

# Mount it at an alternative path. 
app.mount("/socket_asr.io", streamer_asr.app)
