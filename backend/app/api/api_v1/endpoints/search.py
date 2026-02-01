"""
Semantic Search API Endpoints for SmartCut AI
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import os
from pydantic import BaseModel
from app.api.deps import get_db
from app.services.semantic_search_service import semantic_search_service, SearchResult
from app.services.intent_embedding_service import intent_embedding_service
from app.services.query_expansion_service import query_expansion_service
from app.models import database as models

router = APIRouter()


# Request/Response Models
class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    filters: Optional[Dict[str, Any]] = None


class ReasoningResponse(BaseModel):
    matched_because: List[str]
    emotion_detected: str
    timing_pattern: str
    confidence_score: float
    query_intent: Dict
    query_expansion: Optional[List[str]] = None  # Shows how query was expanded (e.g., "FIR" -> "First Incident Report")


class SearchResultResponse(BaseModel):
    result_id: int
    take_id: int
    moment_id: int
    start_time: float
    end_time: float
    confidence: float
    transcript_snippet: str
    emotion_label: str
    file_name: str
    video_url: str
    reasoning: ReasoningResponse


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultResponse]
    query_expanded: Optional[List[str]] = None  # Full list of expanded search terms


class UnifiedSearchResult(BaseModel):
    take_id: int
    file_name: str
    video_url: str
    confidence: float
    match_sources: List[str]
    transcript_snippet: str
    emotion: str
    video_description: str
    audio_description: str


class UnifiedSearchResponse(BaseModel):
    query: str
    expanded_terms: List[str]
    expansion_reasoning: List[str]
    total_results: int
    results: List[UnifiedSearchResult]


class FeedbackRequest(BaseModel):
    query: str
    result_id: int
    is_relevant: bool
    editor_notes: Optional[str] = None


# Endpoints
@router.post("/intent", response_model=SearchResponse)
async def search_by_intent(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Search footage by editorial intent using semantic similarity.
    
    Example queries:
    - "hesitant reaction before answering"
    - "tense pause before dialogue"  
    - "awkward silence after confession"
    """
    # Get expanded terms for response
    expansion = query_expansion_service.expand_query(request.query)
    
    results = semantic_search_service.search_by_intent(
        query=request.query,
        top_k=request.top_k,
        filters=request.filters
    )
    
    return SearchResponse(
        query=request.query,
        total_results=len(results),
        query_expanded=list(expansion["all_search_terms"])[:10] if expansion["expansion_reasoning"] else None,
        results=[
            SearchResultResponse(
                result_id=r.result_id,
                take_id=r.take_id,
                moment_id=r.moment_id,
                start_time=r.start_time,
                end_time=r.end_time,
                confidence=r.confidence,
                transcript_snippet=r.transcript_snippet,
                emotion_label=r.emotion_label,
                file_name=r.file_name,
                video_url=f"/media_files/{os.path.basename(r.file_path)}" if r.file_path else "",
                reasoning=ReasoningResponse(**r.reasoning)
            )
            for r in results
        ]
    )


@router.post("/unified", response_model=UnifiedSearchResponse)
async def unified_search(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Unified search across all data sources: transcripts, descriptions, emotions, and filenames.
    Uses LLM-like query expansion so "FIR" and "First Incident Report" yield same results.
    
    Example queries:
    - "FIR" (expands to "First Incident Report", "First Information Report", "police report")
    - "happy moments" (searches for joy emotions and related keywords)
    - "screen recording" (finds analytical content)
    """
    # Expand query with synonyms and abbreviations
    expansion = query_expansion_service.expand_query(request.query)
    expanded_terms = expansion["all_search_terms"]
    query_emotions = query_expansion_service.get_emotion_mappings(request.query)
    
    # Search database directly
    takes = db.query(models.Take).all()
    
    results = []
    for take in takes:
        meta = take.ai_metadata or {}
        cv_data = meta.get("cv", {})
        audio_data = meta.get("audio", {})
        
        # Gather all searchable text
        transcript = audio_data.get("transcript", "").lower()
        video_desc = cv_data.get("video_description", "").lower()
        audio_desc = audio_data.get("audio_description", "").lower()
        emotion = meta.get("emotion", "neutral").lower()
        fname = (take.file_name or "").lower()
        
        # Combined text for matching
        combined = f"{transcript} {video_desc} {audio_desc} {fname}"
        
        # Calculate match score
        score = 0
        match_sources = []
        
        for term in expanded_terms:
            if term in transcript:
                score += 6
                if "dialog/transcript" not in match_sources:
                    match_sources.append("dialog/transcript")
            if term in video_desc:
                score += 4
                if "video_description" not in match_sources:
                    match_sources.append("video_description")
            if term in audio_desc:
                score += 4
                if "audio_description" not in match_sources:
                    match_sources.append("audio_description")
            if term in emotion or term == emotion:
                score += 5
                if "emotion" not in match_sources:
                    match_sources.append("emotion")
            if term in fname:
                score += 3
                if "filename" not in match_sources:
                    match_sources.append("filename")
        
        # Bonus for emotion category match
        if query_emotions and emotion in query_emotions:
            score += 8
            if "emotion_category" not in match_sources:
                match_sources.append("emotion_category")
        
        if score > 0:
            confidence = min(0.98, 0.4 + (score * 0.04))
            results.append(UnifiedSearchResult(
                take_id=take.id,
                file_name=take.file_name or "",
                video_url=f"/media_files/{os.path.basename(take.file_path)}" if take.file_path else "",
                confidence=confidence,
                match_sources=match_sources,
                transcript_snippet=audio_data.get("transcript", "")[:200],
                emotion=emotion,
                video_description=cv_data.get("video_description", "")[:200],
                audio_description=audio_data.get("audio_description", "")[:200]
            ))
    
    # Sort by confidence
    results.sort(key=lambda x: x.confidence, reverse=True)
    results = results[:request.top_k]
    
    return UnifiedSearchResponse(
        query=request.query,
        expanded_terms=list(expanded_terms)[:15],
        expansion_reasoning=expansion["expansion_reasoning"][:5],
        total_results=len(results),
        results=results
    )


@router.get("/suggestions")
async def get_query_suggestions(
    q: str = Query("", description="Partial query for suggestions")
):
    """
    Get autocomplete suggestions for search queries.
    """
    suggestions = semantic_search_service.get_suggestions(q)
    return {"suggestions": suggestions}


@router.get("/explain/{result_id}")
async def explain_result(result_id: int):
    """
    Get detailed explanation for a specific search result.
    """
    if result_id < 0 or result_id >= len(semantic_search_service.metadata):
        raise HTTPException(status_code=404, detail="Result not found")
    
    meta = semantic_search_service.metadata[result_id]
    
    # Generate detailed explanation
    explanation = {
        "result_id": result_id,
        "take_id": meta["take_id"],
        "timestamp": {
            "start": meta["start_time"],
            "end": meta["end_time"]
        },
        "analysis": {
            "emotion": meta["emotion_label"],
            "transcript": meta["transcript_snippet"],
            "audio_features": meta["audio_features"],
            "timing_data": meta["timing_data"]
        },
        "explanation_text": _generate_explanation_text(meta)
    }
    
    return explanation


def _generate_explanation_text(meta: Dict) -> str:
    """Generate a prose explanation of why this moment is significant."""
    parts = []
    
    emotion = meta.get("emotion_label", "neutral")
    parts.append(f"This moment shows a {emotion} emotional state")
    
    transcript = meta.get("transcript_snippet", "")
    if transcript:
        parts.append(f"with dialogue: \"{transcript}\"")
    else:
        parts.append("without verbal dialogue (non-verbal reaction)")
    
    audio = meta.get("audio_features", {})
    if audio.get("pause_before_duration", 0) > 0.5:
        parts.append(f"There is a notable {audio['pause_before_duration']:.1f}s pause before speaking")
    
    timing = meta.get("timing_data", {})
    if timing.get("pattern"):
        parts.append(f"The timing pattern suggests {timing['pattern'].replace('_', ' ')}")
    
    return ". ".join(parts) + "."


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    """
    Submit relevance feedback to improve search over time.
    This feeds into the Editor DNA / training system.
    """
    # In a full implementation, this would store to database
    # For now, we log and acknowledge
    feedback_data = {
        "query": request.query,
        "result_id": request.result_id,
        "is_relevant": request.is_relevant,
        "notes": request.editor_notes
    }
    
    # TODO: Store in SearchFeedback table and retrain embeddings
    
    return {
        "status": "received",
        "message": "Thank you! Your feedback helps improve search quality.",
        "feedback": feedback_data
    }


@router.get("/stats")
async def get_search_stats():
    """
    Get statistics about the search index.
    """
    return {
        "total_indexed_moments": semantic_search_service.index.ntotal if semantic_search_service.index else 0,
        "embedding_dimension": semantic_search_service.dimension,
        "index_status": "ready" if semantic_search_service.index else "not_initialized"
    }
