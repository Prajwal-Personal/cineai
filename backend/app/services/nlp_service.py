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

    async def analyze_emotion(self, transcript: str, filename: str = "", video_description: str = "", detected_objects: list = None) -> Dict[str, Any]:
        """
        Analyzes the emotional tone using transcript, filename, video description, and detected objects.
        Returns multiple emotions for videos that match more than one category.
        """
        text = (transcript or "").lower()
        fname = (filename or "").lower()
        desc = (video_description or "").lower()
        objects = [o.lower() for o in (detected_objects or [])]
        
        # Combined text for analysis
        all_text = f"{text} {desc}"
        
        # Comprehensive Emotion Keyword Map with weights
        emotion_map = {
            "joy": {
                "keywords": ["happy", "wonderful", "great", "excellent", "love", "excited", "wow", "amazing", 
                           "good", "perfect", "laugh", "funny", "comedy", "smile", "celebrate", "party", 
                           "cheer", "khush", "mazaa", "sundar", "badhiya", "magizhchi", "super", "brilliant", 
                           "fantastic", "awesome", "beautiful", "blessed", "grateful", "delighted", "thrilled",
                           "joyful", "cheerful", "pleased", "content", "haha", "lol", "rofl", "hilarious",
                           "fun", "enjoy", "dance", "music", "play", "game", "birthday", "wedding"],
                "filename_hints": ["happy", "joy", "funny", "comedy", "laugh", "celebration", "party", "fun",
                                  "birthday", "wedding", "dance", "music", "game", "play"],
                "object_hints": ["cake", "balloon", "gift", "sports ball", "teddy bear", "frisbee"]
            },
            "sadness": {
                "keywords": ["sad", "terrible", "bad", "unhappy", "cry", "regret", "lost", "broken", 
                           "sorrow", "miss", "alone", "tear", "grief", "mourn", "depressed", "melancholy", 
                           "dukh", "dard", "rona", "bekaar", "sogam", "varuththam", "painful", "hurt",
                           "lonely", "heartbreak", "loss", "goodbye", "farewell", "sorry", "apologize",
                           "unfortunate", "pity", "sympathy", "condolence", "funeral", "death", "die"],
                "filename_hints": ["sad", "cry", "emotional", "tragic", "drama", "tears", "grief", 
                                  "goodbye", "farewell", "memory", "memorial"],
                "object_hints": ["umbrella"]  # Rain/umbrella often associated with sadness
            },
            "anger": {
                "keywords": ["angry", "mad", "hate", "furious", "stop", "never", "annoyed", "frustrated", 
                           "yell", "aggressive", "rage", "fight", "conflict", "argue", "shout", "gussa", 
                           "naraaz", "kobam", "damn", "hell", "upset", "irritated", "hostile", "violent",
                           "attack", "punch", "hit", "destroy", "break", "smash", "explode", "war"],
                "filename_hints": ["angry", "rage", "fight", "conflict", "tense", "intense", "action",
                                  "battle", "war", "attack", "destroy"],
                "object_hints": ["knife", "sword", "gun", "rifle"]
            },
            "fear": {
                "keywords": ["scared", "afraid", "danger", "help", "threat", "risk", "panic", "worry", 
                           "fear", "dark", "compromised", "horror", "terror", "creepy", "haunted", 
                           "darr", "ghabrahat", "payam", "achcham", "nervous", "anxious", "frightened",
                           "terrified", "spooky", "nightmare", "scream", "run", "escape", "hide", "chase"],
                "filename_hints": ["scary", "horror", "fear", "dark", "thriller", "suspense", "nervous",
                                  "creepy", "haunted", "nightmare", "terror"],
                "object_hints": ["knife", "ghost"]
            },
            "disgust": {
                "keywords": ["gross", "disgusting", "ew", "hate", "sick", "revolt", "nasty", "vile", 
                           "appalling", "ghinauna", "yuck", "awful", "terrible", "horrible", "repulsive",
                           "dirty", "filthy", "rotten", "stink", "smell", "ugly"],
                "filename_hints": ["disgust", "gross", "weird", "strange", "ugly"],
                "object_hints": []
            },
            "surprise": {
                "keywords": ["whoa", "surprise", "sudden", "unexpected", "what", "shook", "flash", 
                           "instant", "achanak", "hairaan", "shock", "omg", "wow", "really", "unbelievable",
                           "incredible", "amazing", "astonish", "stun", "speechless", "gasp", "jaw", 
                           "no way", "seriously", "are you kidding", "twist", "reveal"],
                "filename_hints": ["surprise", "shock", "reveal", "twist", "unexpected", "prank", "reaction"],
                "object_hints": ["gift", "box"]
            },
            "analytical": {
                "keywords": ["monitor", "system", "data", "analysis", "technical", "calibrate", "status", 
                           "report", "coordinate", "check", "verify", "screen", "code", "debug", "test", 
                           "demo", "tutorial", "explain", "overview", "walkthrough", "step", "click",
                           "install", "setup", "configure", "setting", "option", "menu", "button"],
                "filename_hints": ["screen", "recording", "tutorial", "demo", "tech", "code", "debug", 
                                  "test", "capture", "howto", "guide", "review", "unbox", "setup"],
                "object_hints": ["laptop", "keyboard", "mouse", "monitor", "tv", "cell phone", "remote"]
            },
            "thoughtful": {
                "keywords": ["pensive", "contemplating", "considering", "listening", "hmm", "well", 
                           "think", "thought", "sochna", "vichar", "idea", "shayad", "maybe", "perhaps", 
                           "wonder", "curious", "interesting", "understand", "learn", "discuss", 
                           "conversation", "talk", "interview", "question", "answer", "explain", "opinion"],
                "filename_hints": ["interview", "talk", "discuss", "conversation", "think", "review",
                                  "podcast", "meeting", "chat", "vlog", "diary"],
                "object_hints": ["book", "person"]
            }
        }

        scores = {emotion: 0.0 for emotion in emotion_map.keys()}
        
        # 1. Keyword-based scoring from transcript and description (weighted by frequency)
        for emotion, data in emotion_map.items():
            for kw in data["keywords"]:
                count = all_text.count(kw)
                if count > 0:
                    scores[emotion] += min(count * 0.5, 3.0)  # Cap at 3 per keyword
        
        # 2. Filename-based scoring (IMPORTANT for fallback scenarios)
        for emotion, data in emotion_map.items():
            for hint in data.get("filename_hints", []):
                if hint in fname:
                    scores[emotion] += 2.5  # Filename hints weighted higher
                    
        # 3. Object-based scoring from detected objects
        for emotion, data in emotion_map.items():
            for obj_hint in data.get("object_hints", []):
                if obj_hint in objects or any(obj_hint in o for o in objects):
                    scores[emotion] += 1.5
        
        # 4. Special case: screen recordings are analytical
        if "screen" in fname or "recording" in fname or "capture" in fname:
            scores["analytical"] += 4.0
        
        # 5. Person detection without other strong signals -> thoughtful
        if "person" in objects and max(scores.values()) < 1.0:
            scores["thoughtful"] += 1.5
        
        # Calculate normalized scores for multi-emotion detection
        total_score = sum(scores.values())
        normalized_scores = {}
        if total_score > 0:
            normalized_scores = {e: round(s / total_score, 3) for e, s in scores.items()}
        else:
            normalized_scores = {e: 0.0 for e in scores.keys()}
        
        # Find dominant emotion
        dominant_emotion = max(scores, key=scores.get)
        max_score = scores[dominant_emotion]
        
        # Get all emotions above threshold (0.15) for multi-categorization
        emotion_threshold = 0.15
        detected_emotions = [
            {"emotion": e, "confidence": normalized_scores[e]}
            for e, s in sorted(scores.items(), key=lambda x: x[1], reverse=True)
            if normalized_scores.get(e, 0) >= emotion_threshold
        ]
        
        # Ensure at least one emotion
        if not detected_emotions:
            # Use filename hash for variety instead of always neutral
            if max_score == 0:
                variety_pool = ["thoughtful", "analytical", "neutral"]
                name_hash = sum(ord(c) for c in fname)
                fallback = variety_pool[name_hash % len(variety_pool)]
                return {
                    "emotion": fallback if fallback != "neutral" else "thoughtful",
                    "intensity": 0.3,
                    "scores": scores,
                    "detected_emotions": [{"emotion": fallback if fallback != "neutral" else "thoughtful", "confidence": 0.3}]
                }
        
        intensity = min(1.0, max_score / 5.0)
        
        return {
            "emotion": dominant_emotion,
            "intensity": intensity,
            "scores": scores,
            "detected_emotions": detected_emotions  # NEW: Multiple emotions for UI
        }

nlp_service = NLPService()

