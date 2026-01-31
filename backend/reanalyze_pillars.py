from app.db.session import SessionLocal
from app.models import database as models
from app.services.scoring_service import scoring_service
import json

def reanalyze_all():
    db = SessionLocal()
    takes = db.query(models.Take).all()
    print(f"Starting re-analysis of {len(takes)} takes...")

    for take in takes:
        print(f"Re-analyzing Take {take.id}: {take.file_name}")
        
        # Get existing metadata
        meta = take.ai_metadata or {}
        cv_data = meta.get("cv", {})
        audio_data = meta.get("audio", {})
        nlp_data = meta.get("nlp", {})

        # Re-compute scoring with new 7-pillar logic
        res = scoring_service.compute_take_score(cv_data, audio_data, nlp_data)
        
        # Update pillars and critiques
        pillars = res["pillars"]
        critiques = res["critiques"]
        
        # Build reasoning notes
        reasoning_summary = []
        if pillars["performance"] < 75:
            reasoning_summary.append(f"PERFORMANCE: {critiques['performance']}")
        if pillars["story_clarity"] < 75:
            reasoning_summary.append(f"STORY CLARITY: {critiques['story_clarity']}")
        if pillars["technical"] < 75:
            reasoning_summary.append(f"TECHNICAL QUALITY: {critiques['technical']}")
        if pillars["coverage"] < 75:
            reasoning_summary.append(f"COVERAGE: {critiques['coverage']}")
        if pillars["tone_rhythm"] < 75:
            reasoning_summary.append(f"TONE & RHYTHM: {critiques['tone']}")
        if pillars["edit_imagination"] < 75:
            reasoning_summary.append(f"EDIT IMAGINATION: {critiques['editability']}")
        if pillars["instinct"] < 75:
            reasoning_summary.append(f"DIRECTOR'S INSTINCT: {critiques['instinct']}")

        if not reasoning_summary:
            reasoning_summary.append("DIRECTOR'S VERDICT: The take lands perfectly. No critical reshoot risks detected in performance or technicals.")

        # Update model
        take.ai_reasoning = {
            "summary": res["summary"],
            "director_notes": reasoning_summary,
            "pillars": pillars,
            "critiques": critiques
        }
        take.confidence_score = res["total_score"]
        
        # Ensure we don't accidentally wipe other metadata
        db.add(take)
    
    db.commit()
    print("Re-analysis complete. All takes updated with 7-pillar framework.")
    db.close()

if __name__ == "__main__":
    reanalyze_all()
