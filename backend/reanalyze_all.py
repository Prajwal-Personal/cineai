"""
Re-analyze all existing takes with the updated emotion detection logic.
This script triggers the orchestrator to re-process all takes in the database.
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import database as models
from app.services.orchestrator import orchestrator

async def reanalyze_all_takes():
    """Re-run AI analysis on all existing takes."""
    db = SessionLocal()
    
    try:
        # Get all takes
        takes = db.query(models.Take).all()
        print(f"\n🔄 Found {len(takes)} takes to re-analyze\n")
        
        for i, take in enumerate(takes):
            print(f"[{i+1}/{len(takes)}] Processing Take ID {take.id}: {take.file_name}...")
            
            try:
                # Clear old emotion data to force fresh analysis
                meta = dict(take.ai_metadata or {})
                meta["emotion"] = None
                meta["emotion_confidence"] = None
                take.ai_metadata = meta
                take.confidence_score = 0
                db.commit()
                
                # Run the full orchestrator pipeline
                await orchestrator.process_take(take.id)
                
                # Reload and show results
                db.refresh(take)
                meta = take.ai_metadata or {}
                emotion = meta.get("emotion", "unknown")
                confidence = take.confidence_score or 0
                
                print(f"    ✅ Emotion: {emotion} | Confidence: {confidence}/100")
                
            except Exception as e:
                print(f"    ❌ Error: {str(e)}")
                
        print(f"\n✨ Re-analysis complete for {len(takes)} takes!\n")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(reanalyze_all_takes())
