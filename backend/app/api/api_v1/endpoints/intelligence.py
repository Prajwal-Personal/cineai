from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models import database as models

router = APIRouter()

@router.get("/heatmap/{take_id}")
def get_emotion_heatmap(take_id: int, db: Session = Depends(deps.get_db)):
    take = db.query(models.Take).get(take_id)
    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Mock heatmap data (intensity over time)
    return {
        "take_id": take_id,
        "data": [
            {"time": i, "intensity": 40 + (i % 20) + (take_id % 10)} 
            for i in range(0, 100, 5)
        ],
        "primary_emotion": "Tension",
        "confidence": 0.88
    }

@router.get("/risk")
def get_reshoot_risk(db: Session = Depends(deps.get_db)):
    return {
        "risk_level": "Low",
        "factors": [
            {"name": "Coverage", "status": "Good", "risk": 10},
            {"name": "Technical", "status": "Stable", "risk": 5},
            {"name": "Continuity", "status": "Warning", "risk": 35}
        ],
        "reasoning": "Scene 12 has high coverage but minor continuity drift detected in Prop markers."
    }
@router.get("/project-insights")
def get_project_insights(db: Session = Depends(deps.get_db)):
    takes = db.query(models.Take).all()
    
    all_cues = []
    pacing_data = []
    
    # Signatures for reference
    signatures = {
        "The Dark Knight": 3.2, # words/sec target
        "Succession": 4.5,
        "Mad Max": 2.1
    }
    
    for take in takes:
        meta = take.ai_metadata or {}
        
        # 1. Collect Vocal Cues
        cues = meta.get("vocal_cues", [])
        for cue in cues:
            all_cues.append({
                "take_id": take.id,
                "take_name": take.file_name,
                "cue": cue["cue"],
                "text": cue["text"],
                "timestamp": "00:00:00:00", # Mock TC for now
                "confidence": take.confidence_score or 0.1
            })
            
        # 2. Collect Pacing
        pacing_data.append({
            "name": f"T{take.number}",
            "current": meta.get("pacing_signature", 0.0),
            "target": signatures["The Dark Knight"]
        })
        
    return {
        "vocal_cues": sorted(all_cues, key=lambda x: x["take_id"], reverse=True)[:10],
        "pacing_comparison": pacing_data[:10],
        "active_signature": "The Dark Knight",
        "recommendations": [
            {"title": "Pacing Consistency", "desc": "Current takes are 15% faster than 'The Dark Knight' reference signature."},
            {"title": "Intent Match", "desc": "High concentration of 'PRINT IT' cues in Scene 12 suggests a strong hero take selection."},
            {"title": "Dialogue Density", "desc": "Detected overlap in Take 04 and 08 requires careful multi-track editing."}
        ]
    }
