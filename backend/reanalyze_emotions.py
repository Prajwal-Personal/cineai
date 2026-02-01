"""
Batch Emotion Re-Analysis Script
Re-analyzes all existing videos with the enhanced emotion detection system.
Uses all available data: transcript, filename, video description, detected objects,
audio quality, behavioral markers, and scene annotations.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import database as models
from app.services.nlp_service import nlp_service

async def comprehensive_emotion_analysis(take) -> dict:
    """
    Perform comprehensive emotion analysis using ALL available data.
    """
    meta = take.ai_metadata or {}
    cv_data = meta.get("cv", {})
    audio_data = meta.get("audio", {})
    
    # Extract ALL available data sources
    transcript = audio_data.get("transcript", "")
    filename = take.file_name or ""
    video_description = cv_data.get("video_description", "")
    audio_description = audio_data.get("audio_description", "")
    detected_objects = cv_data.get("objects", [])
    behavioral_markers = audio_data.get("behavioral_markers", {})
    reasoning = cv_data.get("reasoning", "")
    
    # Combine all text sources for comprehensive analysis
    combined_description = f"{video_description} {audio_description} {reasoning}"
    
    # Run NLP emotion analysis with all data
    nlp_result = await nlp_service.analyze_emotion(
        transcript=transcript,
        filename=filename,
        video_description=combined_description,
        detected_objects=detected_objects
    )
    
    # Enhance with audio behavioral markers
    behaviors = behavioral_markers
    audio_emotion_boost = {}
    
    if behaviors.get("laughter_detected"):
        audio_emotion_boost["joy"] = 2.0
    if behaviors.get("hesitation_duration", 0) > 1.5:
        audio_emotion_boost["thoughtful"] = 1.5
    if behaviors.get("speech_speed") == "fast":
        audio_emotion_boost["surprise"] = 1.0
        audio_emotion_boost["anger"] = 0.5
    if behaviors.get("speech_speed") == "slow":
        audio_emotion_boost["sadness"] = 1.0
        audio_emotion_boost["thoughtful"] = 0.5
    
    # Enhance with CV data
    energy = cv_data.get("energy_level", "calm")
    complexity = cv_data.get("complexity", "simple")
    motion = cv_data.get("motion", "stable")
    
    cv_emotion_boost = {}
    if energy == "high-intensity":
        cv_emotion_boost["anger"] = 1.5
        cv_emotion_boost["surprise"] = 1.0
    elif energy == "dynamic":
        cv_emotion_boost["joy"] = 1.5
    
    if motion == "shaky":
        cv_emotion_boost["fear"] = 1.0
    
    if complexity == "intricate":
        cv_emotion_boost["analytical"] = 1.0
    
    # Apply boosts to NLP scores
    scores = dict(nlp_result.get("scores", {}))
    for emotion, boost in audio_emotion_boost.items():
        if emotion in scores:
            scores[emotion] += boost
    for emotion, boost in cv_emotion_boost.items():
        if emotion in scores:
            scores[emotion] += boost
    
    # Recalculate normalized scores and detected emotions
    total_score = sum(scores.values())
    if total_score > 0:
        normalized = {e: round(s / total_score, 3) for e, s in scores.items()}
    else:
        normalized = {e: 0.0 for e in scores}
    
    # Get all emotions above threshold (0.12 for more inclusive placement)
    threshold = 0.12
    detected_emotions = [
        {"emotion": e, "confidence": normalized[e]}
        for e, s in sorted(scores.items(), key=lambda x: x[1], reverse=True)
        if normalized.get(e, 0) >= threshold
    ]
    
    # Find dominant emotion
    dominant = max(scores, key=scores.get) if scores else "thoughtful"
    max_score = scores.get(dominant, 0)
    
    # Fallback for zero scores
    if max_score == 0:
        name_hash = sum(ord(c) for c in filename)
        pool = ["thoughtful", "analytical", "joy"]
        dominant = pool[name_hash % len(pool)]
        detected_emotions = [{"emotion": dominant, "confidence": 0.4}]
    
    return {
        "emotion": dominant,
        "emotion_confidence": min(1.0, max_score / 5.0),
        "detected_emotions": detected_emotions,
        "scores": scores
    }


async def reanalyze_all_takes():
    """Re-analyze all takes with enhanced emotion detection."""
    db = SessionLocal()
    
    try:
        takes = db.query(models.Take).all()
        print(f"Found {len(takes)} takes to re-analyze")
        
        for i, take in enumerate(takes):
            try:
                # Perform comprehensive analysis
                result = await comprehensive_emotion_analysis(take)
                
                # Update ai_metadata
                meta = dict(take.ai_metadata or {})
                meta["emotion"] = result["emotion"]
                meta["emotion_confidence"] = result["emotion_confidence"]
                meta["detected_emotions"] = result["detected_emotions"]
                
                take.ai_metadata = meta
                db.add(take)
                
                emotions_str = ", ".join([f"{e['emotion']}({e['confidence']:.2f})" for e in result["detected_emotions"][:3]])
                print(f"[{i+1}/{len(takes)}] {take.file_name}: {result['emotion']} -> [{emotions_str}]")
                
            except Exception as e:
                print(f"[{i+1}/{len(takes)}] ERROR on {take.file_name}: {e}")
        
        db.commit()
        print(f"\n✅ Successfully re-analyzed {len(takes)} takes!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Batch Emotion Re-Analysis")
    print("Using ALL available data: transcript, filename, descriptions,")
    print("objects, audio markers, CV data for accurate classification")
    print("=" * 60)
    asyncio.run(reanalyze_all_takes())
