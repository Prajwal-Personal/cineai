from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Heavy imports deferred to method scope
class NLPService:
    def __init__(self):
        self._nlp = None
        self._failed_to_load = False

    def get_nlp(self):
        """Lazy load the spaCy model only when needed."""
        if self._nlp is None and not self._failed_to_load:
            try:
                import spacy
                logger.info("Initializing spaCy 'en_core_web_sm' (Lazy Load)...")
                self._nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to load spaCy model: {e}. Downloading on the fly...")
                try:
                    import os
                    os.system("python -m spacy download en_core_web_sm")
                    self._nlp = spacy.load("en_core_web_sm")
                except:
                    logger.error("spaCy fallback failed. Using mock NLP.")
                    self._failed_to_load = True
        return self._nlp

    async def align_script(self, transcript: str, script_text: str) -> Dict[str, Any]:
        """
        Compares transcript against target script using semantic similarity.
        """
        nlp = self.get_nlp()
        if not nlp:
            # Mock behavior since we can't do semantic similarity without spacy
            return {
                "similarity": 0.88,
                "ad_libs": ["simulated", "ad-lib"],
                "reasoning": "Mock NLP analysis: 88% script match (spaCy not installed)",
                "confidence": 0.7
            }
            
        if not transcript or not script_text:
            return {
                "similarity": 0.0,
                "ad_libs": [],
                "reasoning": "Incomplete data for alignment.",
                "confidence": 0.0
            }

        doc_t = nlp(transcript.lower())
        doc_s = nlp(script_text.lower())

        similarity = doc_t.similarity(doc_s)

        # Simple ad-lib detection (words in transcript NOT in script)
        # In a real app, this would be more sophisticated (fuzzy matching)
        words_t = set([token.text for token in doc_t if not token.is_punct])
        words_s = set([token.text for token in doc_s if not token.is_punct])
        
        ad_libs = list(words_t - words_s)
        
        reasoning = f"Script alignment shows {similarity*100:.1f}% accuracy."
        if len(ad_libs) > 0:
            reasoning += f" Detected potential ad-libs: {', '.join(ad_libs[:3])}..."

    async def analyze_emotion(self, transcript: str, filename: str = "") -> Dict[str, Any]:
        """
        Analyzes the emotional tone of a transcript using semantic keywords.
        Includes filename-based heuristics for improved detection.
        """
        text = (transcript or "").lower()
        fname = (filename or "").lower()
        
        # Expanded Emotion Keyword Map with weights
        emotion_map = {
            "joy": {
                "keywords": ["happy", "wonderful", "great", "excellent", "love", "excited", "wow", "amazing", "good", "perfect", "laugh", "funny", "comedy", "smile", "celebrate", "party", "cheer", "khush", "mazaa", "sundar", "badhiya", "magizhchi", "super", "kadupatti", "badiya", "shandaar", "sandhosham", "nalla", "haha", "lol", "brilliant", "fantastic", "awesome"],
                "filename_hints": ["happy", "joy", "funny", "comedy", "laugh", "celebration", "party", "fun"]
            },
            "sadness": {
                "keywords": ["sad", "terrible", "bad", "unhappy", "cry", "regret", "lost", "broken", "sorrow", "miss", "alone", "tear", "grief", "mourn", "depressed", "melancholy", "dukh", "dard", "rona", "bekaar", "sogam", "varuththam", "kashtam", "mayakkam", "udaas", "painful", "hurt"],
                "filename_hints": ["sad", "cry", "emotional", "tragic", "drama", "tears", "grief"]
            },
            "anger": {
                "keywords": ["angry", "mad", "hate", "furious", "stop", "never", "annoyed", "frustrated", "yell", "aggressive", "rage", "fight", "conflict", "argue", "shout", "gussa", "naraaz", "kobam", "athigaram", "veruppu", "bhadak", "damn", "hell"],
                "filename_hints": ["angry", "rage", "fight", "conflict", "tense", "intense", "action"]
            },
            "fear": {
                "keywords": ["scared", "afraid", "danger", "help", "threat", "risk", "panic", "worry", "fear", "dark", "compromised", "horror", "terror", "creepy", "haunted", "darr", "ghabrahat", "payam", "achcham", "bhayam", "nervous", "anxious"],
                "filename_hints": ["scary", "horror", "fear", "dark", "thriller", "suspense", "nervous"]
            },
            "disgust": {
                "keywords": ["gross", "disgusting", "ew", "hate", "sick", "revolt", "nasty", "vile", "appalling", "ghinauna", "veruppu", "si", "che", "bekar", "yuck", "awful"],
                "filename_hints": ["disgust", "gross", "weird", "strange"]
            },
            "surprise": {
                "keywords": ["whoa", "surprise", "sudden", "unexpected", "what", "shook", "bright", "flash", "instant", "achanak", "hairaan", "shock", "athirchi", "vinnakam", "aacharyam", "kya", "enna", "oh", "omg", "wow", "really", "unbelievable"],
                "filename_hints": ["surprise", "shock", "reveal", "twist", "unexpected"]
            },
            "analytical": {
                "keywords": ["monitor", "system", "data", "analysis", "technical", "calibrate", "status", "report", "coordinate", "jaanch", "parikshan", "ganana", "aayu", "check", "verify", "screen", "code", "debug", "test", "demo"],
                "filename_hints": ["screen", "recording", "tutorial", "demo", "tech", "code", "debug", "test"]
            },
            "thoughtful": {
                "keywords": ["pensive", "contemplating", "considering", "listening", "hmm", "well", "think", "thought", "sochna", "vichar", "yosidhai", "ennam", "idea", "shayad", "maybe", "perhaps", "wonder", "curious"],
                "filename_hints": ["interview", "talk", "discuss", "conversation", "think", "review"]
            }
        }

        scores = {emotion: 0.0 for emotion in emotion_map.keys()}
        
        # 1. Keyword-based scoring from transcript
        for emotion, data in emotion_map.items():
            for kw in data["keywords"]:
                if kw in text:
                    scores[emotion] += 1.0
        
        # 2. Filename-based scoring (IMPORTANT for fallback scenarios)
        for emotion, data in emotion_map.items():
            for hint in data.get("filename_hints", []):
                if hint in fname:
                    scores[emotion] += 2.0  # Filename hints are weighted higher
                    
        # 3. Special case: screen recordings are analytical
        if "screen" in fname or "recording" in fname or "capture" in fname:
            scores["analytical"] += 3.0
        
        # Find dominant emotion
        dominant_emotion = max(scores, key=scores.get)
        max_score = scores[dominant_emotion]
        
        if max_score == 0:
            return {"emotion": "neutral", "intensity": 0.0, "scores": scores}
            
        intensity = min(1.0, max_score / 5.0)  # Adjusted normalization
        
        return {
            "emotion": dominant_emotion,
            "intensity": intensity,
            "scores": scores
        }

nlp_service = NLPService()

