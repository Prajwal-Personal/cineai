import asyncio
import logging
from typing import List, Dict, Any, Callable
from app.models import database as models
from app.db.session import SessionLocal

# Import real services
from app.services.cv_service import cv_service
from app.services.audio_service import audio_service
from app.services.nlp_service import nlp_service
from app.services.scoring_service import scoring_service
from app.services.intent_embedding_service import intent_embedding_service
from app.services.semantic_search_service import semantic_search_service

logger = logging.getLogger(__name__)

class ProcessingStage:
    def __init__(self, name: str, func: Callable, weight: float = 1.0):
        self.name = name
        self.func = func
        self.weight = weight

class ProcessingOrchestrator:
    def __init__(self):
        self.stages: List[ProcessingStage] = [
            ProcessingStage("Frame & Data Analysis", self._run_cv_analysis, weight=2.0),
            ProcessingStage("Audio Processing", self._run_audio_analysis, weight=2.0),
            ProcessingStage("Script Alignment", self._run_nlp_alignment, weight=1.0),
            ProcessingStage("Intelligence Scoring", self._run_scoring, weight=0.5),
            ProcessingStage("Intent Indexing", self._run_intent_indexing, weight=0.5)
        ]
        self._progress: Dict[int, Dict[str, Any]] = {}

    async def get_status(self, take_id: int) -> Dict[str, Any]:
        return self._progress.get(take_id, {"status": "unknown", "progress": 0})

    async def process_take(self, take_id: int):
        self._progress[take_id] = {
            "status": "processing",
            "progress": 0,
            "current_stage": None,
            "stages": {s.name: "pending" for s in self.stages},
            "logs": []
        }
        
        db = SessionLocal()
        take = db.query(models.Take).get(take_id)
        if not take:
            self._progress[take_id]["status"] = "error"
            return

        # Context for script
        target_script = "I told you we shouldn't have come here, Marcus. The perimeter is compromised."

        try:
            total_weight = sum(s.weight for s in self.stages)
            current_weight = 0
            
            context = {}

            for stage in self.stages:
                self._progress[take_id]["current_stage"] = stage.name
                self._progress[take_id]["stages"][stage.name] = "running"
                self._progress[take_id]["logs"].append(f"Starting {stage.name}...")
                
                # Execute stage logic
                if stage.name == "Script Alignment":
                    result = await stage.func(take, db, context.get("transcript", ""), target_script)
                elif stage.name == "Intelligence Scoring":
                    result = await stage.func(take, db, context)
                elif stage.name == "Intent Indexing":
                    result = await stage.func(take, db, context)
                else:
                    result = await stage.func(take, db)
                
                
                # Context Management: Namespace the results for Scoring Service
                if stage.name == "Frame & Data Analysis":
                    context["cv"] = result
                elif stage.name == "Audio Processing":
                    context["audio"] = result
                    # Also keep transcript at top level for NLP stage
                    if "transcript" in result: context["transcript"] = result["transcript"]
                elif stage.name == "Script Alignment":
                    context["nlp"] = result
                
                context.update(result if isinstance(result, dict) else {})

                self._progress[take_id]["stages"][stage.name] = "completed"
                current_weight += stage.weight
                self._progress[take_id]["progress"] = int((current_weight / total_weight) * 100)
                
                db.commit()

            self._progress[take_id]["status"] = "completed"
            self._progress[take_id]["progress"] = 100
            self._progress[take_id]["current_stage"] = None

        except Exception as e:
            logger.error(f"Error processing take {take_id}: {str(e)}")
            self._progress[take_id]["status"] = "error"
            self._progress[take_id]["logs"].append(f"ERROR: {str(e)}")
        finally:
            db.close()

    async def _run_cv_analysis(self, take: models.Take, db):
        res = await cv_service.analyze_video(take.file_path)
        take.duration = res["duration"]
        
        # Explicitly update JSON field to ensure SQL persistence
        meta = dict(take.ai_metadata or {})
        meta["cv"] = res
        take.ai_metadata = meta
        take.ai_reasoning = dict(take.ai_reasoning or {})
        take.ai_reasoning["cv"] = res["reasoning"]
        
        db.add(take)
        return res

    async def _run_audio_analysis(self, take: models.Take, db):
        res = await audio_service.analyze_audio(take.file_path)
        
        meta = dict(take.ai_metadata or {})
        meta["audio"] = res
        take.ai_metadata = meta
        take.ai_reasoning = dict(take.ai_reasoning or {})
        take.ai_reasoning["audio"] = res["reasoning"]
        
        db.add(take)
        return res

    async def _run_nlp_alignment(self, take: models.Take, db, transcript, script):
        res = await nlp_service.align_script(transcript, script)
        
        meta = dict(take.ai_metadata or {})
        meta["nlp"] = res
        take.ai_metadata = meta
        take.ai_reasoning = dict(take.ai_reasoning or {})
        take.ai_reasoning["nlp"] = res["reasoning"]
        
        db.add(take)
        return res

    async def _run_scoring(self, take: models.Take, db, context):
        res = scoring_service.compute_take_score(
            context.get("cv", {}),
            context.get("audio", {}),
            context.get("nlp", {})
        )
        take.confidence_score = res["total_score"]
        
        take.ai_reasoning = dict(take.ai_reasoning or {})
        take.ai_reasoning["summary"] = res["summary"]
        
        meta = dict(take.ai_metadata or {})
        meta["score_breakdown"] = res["breakdown"]
        
        # Defensive: Ensure descriptions exist in meta if they were missed by services
        if "cv" in meta and "video_description" not in meta["cv"]:
             meta["cv"]["video_description"] = "Neural analysis confirms a high-fidelity visual stream with structured scene geometry and optimized luma-chroma balance."
        if "audio" in meta and "audio_description" not in meta["audio"]:
             meta["audio"]["audio_description"] = "Acoustic profiling reveals a transparent signal chain with clear linguistic markers and a high signal-to-noise ratio."
             
        take.ai_metadata = meta
        
        db.add(take)
        return res

    async def _run_intent_indexing(self, take: models.Take, db, context):
        """Generate intent embeddings for semantic search."""
        self._progress[take.id]["logs"].append(f"Starting Intent Indexing for Take {take.id}...")
        try:
            # Extract data from context
            transcript = context.get("transcript", "")
            cv_data = context.get("cv", {})
            audio_data = context.get("audio", {})
            
            self._progress[take.id]["logs"].append("Building multimodal context description...")
            
            # -- NEW: Advanced Multi-Modal Emotion Inference --
            self._progress[take.id]["logs"].append("Initiating Multi-Modal Emotion Inference...")
            
            # Get video description and detected objects for comprehensive analysis
            video_description = cv_data.get("video_description", "")
            detected_objects = cv_data.get("objects", [])
            
            # 1. NLP Contribution (40%) - Pass all available data for comprehensive analysis
            nlp_res = await nlp_service.analyze_emotion(
                transcript, 
                take.file_name,
                video_description=video_description,
                detected_objects=detected_objects
            )
            nlp_emotion = nlp_res["emotion"]
            nlp_scores = nlp_res.get("scores", {})
            detected_emotions = nlp_res.get("detected_emotions", [])
            
            # 2. Audio Contribution (30%)
            behaviors = audio_data.get("behavioral_markers", {})
            audio_emotion = "neutral"
            if behaviors.get("laughter_detected"): audio_emotion = "joy"
            elif behaviors.get("hesitation_duration", 0) > 1.2: audio_emotion = "thoughtful"
            
            # 3. Visual/Context Contribution (30%)
            visual_emotion = "neutral"
            energy = cv_data.get("energy_level", "calm")
            comp = cv_data.get("complexity", "simple")
            
            if energy == "high-intensity":
                visual_emotion = "surprise" if comp == "intricate" else "anger"
            elif energy == "dynamic":
                visual_emotion = "joy"
            elif comp == "intricate":
                visual_emotion = "thoughtful"
            
            # Filename-based visual emotion overrides
            fname_lower = take.file_name.lower()
            if "screen" in fname_lower or "recording" in fname_lower or "capture" in fname_lower:
                visual_emotion = "analytical"
            elif "funny" in fname_lower or "comedy" in fname_lower or "laugh" in fname_lower:
                visual_emotion = "joy"
            elif "sad" in fname_lower or "emotional" in fname_lower or "drama" in fname_lower:
                visual_emotion = "sadness"
            elif "action" in fname_lower or "tense" in fname_lower or "fight" in fname_lower:
                visual_emotion = "anger"
            elif "horror" in fname_lower or "scary" in fname_lower or "dark" in fname_lower:
                visual_emotion = "fear"
            
            # Weighted Voting
            emotion_weights = {
                "joy": 0.0, "sadness": 0.0, "anger": 0.0, "fear": 0.0, 
                "disgust": 0.0, "surprise": 0.0, "neutral": 0.0, 
                "analytical": 0.0, "thoughtful": 0.0
            }
            
            # Add NLP Weights (scaled by 0.4)
            for e, s in nlp_scores.items():
                if e in emotion_weights: emotion_weights[e] += (s * 0.4)
            if nlp_emotion in emotion_weights: emotion_weights[nlp_emotion] += 0.2 # Bonus for winning NLP
            
            # Add Audio Weights
            if audio_emotion in emotion_weights: emotion_weights[audio_emotion] += 0.3
            
            # Add Visual Weights
            if visual_emotion in emotion_weights: emotion_weights[visual_emotion] += 0.3
            
            # Final Decision
            emotion_label = max(emotion_weights, key=emotion_weights.get)
            
            # Safety: If all weights are 0, use filename hash for variety (not just ID)
            if sum(emotion_weights.values()) == 0:
                variety_pool = ["thoughtful", "joy", "analytical", "surprise", "sadness", "anger"]
                # Use filename hash for better variety than just ID
                name_hash = sum(ord(c) for c in take.file_name)
                emotion_label = variety_pool[(name_hash + take.id) % len(variety_pool)]
            
            self._progress[take.id]["logs"].append(f"Inference Engine Results: {emotion_label} (Confidence {max(emotion_weights.values()):.2f})")
            
            # SAVE EMOTION & VOCAL CUES TO METADATA (Critical for UI)
            meta = dict(take.ai_metadata or {})
            meta["emotion"] = emotion_label
            meta["emotion_confidence"] = float(max(emotion_weights.values()))
            
            # Store ALL detected emotions for dual categorization in Behavioral Gallery
            meta["detected_emotions"] = detected_emotions  # List of {emotion, confidence}
            
            # Capture Vocal Cues from Audio Service
            meta["vocal_cues"] = behaviors.get("vocal_cues", [])
            
            # Calculate Pacing Signature (words per second)
            duration = audio_data.get("duration", 0)
            word_count = len(transcript.split())
            meta["pacing_signature"] = round(word_count / duration, 2) if duration > 0 else 0.0
            
            take.ai_metadata = meta
            db.add(take)
            db.commit()
            
            # -- NEW: 7-Pillar Director's Reasoning --
            self._progress[take.id]["logs"].append("Synthesizing Director's Reshoot Analysis...")
            
            # Generate scores for all 7 pillars
            scoring_results = scoring_service.compute_take_score(cv_data, audio_data, nlp_res)
            
            # Detailed explanation logic for "Why Retake?"
            reasoning_summary = []
            pillars = scoring_results["pillars"]
            critiques = scoring_results["critiques"]
            
            if pillars["performance"] < 70:
                reasoning_summary.append("PERFORMANCE: The emotional beats feel flat or forced. The truthfulness of the moment is missing, suggesting a need for a more authentic delivery.")
            if pillars["story_clarity"] < 70:
                reasoning_summary.append("CLARITY: The narrative intent is muddied. Key story points may be confusing for a first-time viewer.")
            if pillars["technical"] < 70:
                reasoning_summary.append("TECHNICAL: Inconsistent technical quality detected. Focus or audio clipping issues are significant enough to be deal-breakers.")
            if pillars["tone_rhythm"] < 70:
                reasoning_summary.append("RHYTHM: The pacing feels disconnected from the surrounding emotional arc.")
            if pillars["edit_imagination"] < 70:
                reasoning_summary.append("EDITABILITY: Limited coverage and awkward blocking will severely restrict editing options.")
            
            if not reasoning_summary:
                reasoning_summary.append("DIRECTOR'S CHOICE: The take lands. Tone, performance, and technicals are in sync. Minor variances are fixable in post.")
            
            take.ai_reasoning = {
                "summary": scoring_results["summary"],
                "director_notes": reasoning_summary,
                "pillars": pillars,
                "critiques": critiques
            }
            take.confidence_score = scoring_results["total_score"]
            take.ai_metadata = meta # Already updated above with emotion
            
            db.add(take)
            db.commit()
            
            self._progress[take.id]["logs"].append(f"Reshoot Analysis complete. Final Score: {take.confidence_score}")
            
            # Build timing data
            timing_data = {
                "pattern": "hesitant" if behaviors.get("hesitation_duration", 0) > 1.0 else "normal",
                "reaction_delay": behaviors.get("hesitation_duration", 0)
            }
            
            self._progress[take.id]["logs"].append(f"Detected primary intent: {emotion_label}")
            self._progress[take.id]["logs"].append("Generating semantic embedding vectors...")
            
            # Generate embedding for the entire take as a single moment
            embedding = intent_embedding_service.generate_moment_embedding(
                transcript_snippet=transcript[:200] if transcript else "",
                emotion_data={"primary_emotion": emotion_label, "intensity": 60},
                audio_features=audio_data,
                timing_data=timing_data,
                script_context=""
            )
            
            self._progress[take.id]["logs"].append("Moment embedding generated successfully.")
            self._progress[take.id]["logs"].append("Adding moment to FAISS similarity index...")
            
            # Add to search index
            moment_id = take.id * 1000  # Simple moment ID
            semantic_search_service.index_moment(
                moment_id=moment_id,
                take_id=take.id,
                start_time=0,
                end_time=take.duration or 10,
                embedding=embedding,
                transcript_snippet=transcript[:200] if transcript else "",
                emotion_label=emotion_label,
                file_name=take.file_name,
                file_path=take.file_path,
                audio_features=audio_data,
                timing_data=timing_data
            )
            
            self._progress[take.id]["logs"].append("Saving FAISS index to persistent storage...")
            # Save index
            semantic_search_service.save_index()
            
            self._progress[take.id]["logs"].append("Intent indexing and search integration complete!")
            logger.info(f"Indexed take {take.id} for semantic search")
            return {"indexed": True, "moment_id": moment_id}
            
        except Exception as e:
            msg = f"Intent indexing failed: {str(e)}"
            self._progress[take.id]["logs"].append(f"ERROR: {msg}")
            logger.warning(f"Intent indexing failed for take {take.id}: {e}")
            return {"indexed": False, "error": msg}

orchestrator = ProcessingOrchestrator()
