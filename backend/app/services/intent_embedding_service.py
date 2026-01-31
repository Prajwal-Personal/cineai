"""
Intent Embedding Service for SmartCut AI
Generates multimodal intent vectors from video moments for semantic search.
"""
import numpy as np
import logging
from typing import Dict, Any, List, Optional
import json

logger = logging.getLogger(__name__)

# Lazy loading for sentence-transformers (heavy import)
_sentence_model = None

def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded sentence-transformers model: all-MiniLM-L6-v2")
        except Exception as e:
            logger.warning(f"Failed to load sentence-transformers: {e}. Using mock embeddings.")
            _sentence_model = "mock"
    return _sentence_model


class IntentEmbeddingService:
    """
    Generates multimodal intent embeddings for video moments.
    Combines: emotion, audio features, transcript context, timing cues.
    """
    
    EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 dimension
    
    # Emotion vocabulary for embedding
    EMOTION_LABELS = [
        "neutral", "joy", "sadness", "anger", "fear", "surprise", 
        "disgust", "analytical", "thoughtful", "tense", "relieved",
        "awkward", "confident", "anxious", "calm"
    ]
    
    # Temporal patterns
    TIMING_PATTERNS = [
        "pause_before_speech", "pause_after_speech", "quick_response",
        "overlapping_speech", "silence", "sustained_pause", "interrupted"
    ]
    
    def __init__(self):
        self.model = None
        
    def _get_model(self):
        if self.model is None:
            self.model = get_sentence_model()
        return self.model
    
    def generate_moment_embedding(
        self,
        transcript_snippet: str = "",
        emotion_data: Dict[str, Any] = None,
        audio_features: Dict[str, Any] = None,
        timing_data: Dict[str, Any] = None,
        script_context: str = ""
    ) -> np.ndarray:
        """
        Generate a unified intent embedding for a video moment.
        """
        model = self._get_model()
        
        # Build descriptive text combining all modalities
        intent_description = self._build_intent_description(
            transcript_snippet, emotion_data, audio_features, timing_data, script_context
        )
        
        # Generate embedding
        if model == "mock":
            np.random.seed(hash(intent_description) % 2**32)
            embedding = np.random.randn(self.EMBEDDING_DIM).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
        else:
            embedding = model.encode(intent_description, normalize_embeddings=True)
        
        return embedding.astype(np.float32)
    
    def _build_intent_description(
        self,
        transcript: str,
        emotion_data: Dict,
        audio_features: Dict,
        timing_data: Dict,
        script_context: str
    ) -> str:
        """
        Build a natural language description of the moment's intent.
        """
        parts = []
        
        if transcript and transcript.strip():
            parts.append(f"Dialogue: {transcript.strip()}")
        else:
            parts.append("No dialogue, silent moment")
        
        if emotion_data:
            emotion = emotion_data.get("primary_emotion", "neutral")
            intensity = emotion_data.get("intensity", 50)
            parts.append(f"Emotion: {emotion} (intensity {intensity}%)")
        
        if audio_features:
            if audio_features.get("laughter_detected", False):
                parts.append("Laughter detected during this moment")
            if audio_features.get("speech_rate"):
                parts.append(f"Speech rate: {audio_features['speech_rate']}")
        
        if timing_data:
            pattern = timing_data.get("pattern", "")
            if pattern:
                parts.append(f"Timing: {pattern.replace('_', ' ')}")
        
        return ". ".join(parts)
    
    def parse_query_intent(self, query: str) -> Dict[str, Any]:
        """
        Parse an editor's search query to extract intent components.
        """
        query_lower = query.lower()
        
        intent = {
            "raw_query": query,
            "emotions": [],
            "temporal_cues": [],
            "actions": [],
            "narrative_hints": []
        }
        
        emotion_keywords = {
            "joy": ["joy", "happy", "joyful", "elated", "pleased", "smiling", "laughing", "laughter"],
            "sadness": ["sad", "sadness", "depressed", "melancholy", "tearful", "crying", "grief"],
            "anger": ["angry", "anger", "furious", "irritated", "frustrated", "rage", "confrontation"],
            "fear": ["fearful", "fear", "afraid", "scared", "terrified", "panic", "anxious"],
            "disgust": ["disgust", "disgusted", "revolted", "gross", "loathing"],
            "surprise": ["surprised", "surprise", "shocked", "startled", "amazed"],
            "analytical": ["analytical", "logic", "calculated", "technical", "screen recording"],
            "thoughtful": ["thoughtful", "pensive", "contemplating", "considering", "listening"],
            "tense": ["tense", "tension", "strained", "stressed", "uncomfortable"],
            "relieved": ["relieved", "relief", "relaxed", "safe"],
            "awkward": ["awkward", "uncomfortable", "nervous", "hesitant"],
            "confident": ["confident", "assured", "bold", "strong"]
        }
        
        for emotion, keywords in emotion_keywords.items():
            if any(kw in query_lower for kw in keywords):
                intent["emotions"].append(emotion)
        
        temporal_keywords = {
            "before": ["before", "prior to", "leading up to"],
            "after": ["after", "following", "post"],
            "during": ["during", "while", "mid-"],
            "pause": ["pause", "silence", "quiet", "still"]
        }
        
        for temporal, keywords in temporal_keywords.items():
            if any(kw in query_lower for kw in keywords):
                intent["temporal_cues"].append(temporal)
        
        return intent
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a search query with enhanced intent context.
        """
        model = self._get_model()
        intent = self.parse_query_intent(query)
        
        enhanced_query = query
        if intent["emotions"]:
            enhanced_query += f". Emotion: {', '.join(intent['emotions'])}"
        if intent["temporal_cues"]:
            enhanced_query += f". Timing: {', '.join(intent['temporal_cues'])}"
        
        if model == "mock":
            np.random.seed(hash(enhanced_query) % 2**32)
            embedding = np.random.randn(self.EMBEDDING_DIM).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
        else:
            embedding = model.encode(enhanced_query, normalize_embeddings=True)
        
        return embedding.astype(np.float32)

# Singleton instance
intent_embedding_service = IntentEmbeddingService()
