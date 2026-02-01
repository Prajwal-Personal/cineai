"""
AI Monitor API Endpoints
Full video analysis with YOLOv8 object detection and Whisper transcription.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import database as models
from app.services.cv_service import cv_service
from app.services.audio_service import audio_service
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze-full/{take_id}")
async def analyze_full(take_id: int):
    """
    Complete video analysis with YOLO object detection + Whisper transcription.
    Returns comprehensive metadata, timestamped detections, and transcript segments.
    """
    db = SessionLocal()
    try:
        take = db.query(models.Take).filter(models.Take.id == take_id).first()
        if not take:
            raise HTTPException(status_code=404, detail=f"Take {take_id} not found")
        
        video_path = os.path.join(settings.STORAGE_PATH, take.file_name)
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail=f"Video file not found: {take.file_name}")
        
        logger.info(f"Starting full AI analysis for take {take_id}: {take.file_name}")
        
        # Run both analyses
        cv_result = await cv_service.analyze_video_full(video_path)
        audio_result = await audio_service.analyze_audio_full(video_path)
        
        result = {
            "take_id": take_id,
            "file_name": take.file_name,
            "video_analysis": cv_result,
            "audio_analysis": audio_result,
            "combined_timeline": _merge_timelines(cv_result, audio_result)
        }
        
        logger.info(f"Full AI analysis complete for take {take_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Full analysis failed for take {take_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/metadata/{take_id}")
async def get_metadata(take_id: int):
    """
    Get video technical metadata without running full analysis.
    Faster endpoint for quick metadata display.
    """
    db = SessionLocal()
    try:
        take = db.query(models.Take).filter(models.Take.id == take_id).first()
        if not take:
            raise HTTPException(status_code=404, detail=f"Take {take_id} not found")
        
        video_path = os.path.join(settings.STORAGE_PATH, take.file_name)
        
        metadata = {
            "take_id": take_id,
            "file_name": take.file_name,
            "exists": os.path.exists(video_path)
        }
        
        if metadata["exists"]:
            try:
                import cv2
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    metadata["fps"] = round(cap.get(cv2.CAP_PROP_FPS), 2)
                    metadata["frame_count"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    metadata["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    metadata["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    metadata["duration"] = round(metadata["frame_count"] / metadata["fps"], 2) if metadata["fps"] > 0 else 0
                    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
                    metadata["codec"] = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)]).strip()
                    cap.release()
                    
                file_stats = os.stat(video_path)
                metadata["file_size_mb"] = round(file_stats.st_size / (1024 * 1024), 2)
            except Exception as e:
                metadata["error"] = str(e)
        
        return metadata
        
    finally:
        db.close()


@router.get("/status/{take_id}")
async def get_analysis_status(take_id: int):
    """
    Check if a take has existing AI analysis results.
    """
    db = SessionLocal()
    try:
        take = db.query(models.Take).filter(models.Take.id == take_id).first()
        if not take:
            raise HTTPException(status_code=404, detail=f"Take {take_id} not found")
        
        has_metadata = take.ai_metadata is not None and len(take.ai_metadata) > 0
        
        return {
            "take_id": take_id,
            "has_analysis": has_metadata,
            "confidence_score": take.confidence_score if has_metadata else None
        }
    finally:
        db.close()


def _merge_timelines(cv_result: dict, audio_result: dict) -> list:
    """
    Merge video detection timeline with audio transcript segments
    into a unified timeline for display.
    """
    timeline = []
    
    # Add video detections
    for entry in cv_result.get("timeline", []):
        timeline.append({
            "timestamp": entry["timestamp"],
            "type": "detection",
            "content": f"Detected: {', '.join(entry['objects'][:3])}",
            "object_count": entry.get("object_count", 0)
        })
    
    # Add audio segments
    for seg in audio_result.get("segments", []):
        timeline.append({
            "timestamp": seg["start"],
            "type": "transcript",
            "content": seg["text"],
            "end_time": seg["end"],
            "confidence": seg.get("confidence", 0)
        })
    
    # Sort by timestamp
    timeline.sort(key=lambda x: x["timestamp"])
    
    return timeline
