from typing import List, Dict, Any
from app.services.nlp_service import nlp_service # Reuse existing NLP if possible

import re

class ScriptAnalysisService:
    def __init__(self):
        # NLP-lite patterns for extracting drama from text
        self.action_keywords = {
            "conflict": ["confront", "fight", "argue", "scream", "shout", "push", "hit", "gussa", "kobam"],
            "emotion": ["cry", "laugh", "smile", "whisper", "tremble", "rona", "hansna", "khush"],
            "physical": ["run", "jump", "walk", "sit", "stand", "bhagna", "baithna"],
            "suspense": ["hide", "watch", "creep", "silence", "dark", "chhupna", "andhera"]
        }

    async def analyze_script(self, elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Orchestrates multi-domain analysis with deep context alignment.
        """
        scenes = self._group_by_scene(elements)
        characters = self._analyze_characters(elements)
        
        # Detection of main language script
        text_content = " ".join([e["text"] for e in elements])
        is_hindi = any("\u0900" <= char <= "\u097F" for char in text_content)
        is_tamil = any("\u0B80" <= char <= "\u0BFF" for char in text_content)
        lang_context = "Hindi/Hinglish" if is_hindi else "Tamil/Tamilish" if is_tamil else "English"

        # Executive Summary tailored to content
        exec_summary = [
            f"Production context identified as {lang_context} with {len(scenes)} distinct shooting blocks.",
            f"Key focus on {'high-intensity conflict' if 'shout' in text_content.lower() or 'gussa' in text_content.lower() else 'character nuance'} across {len(characters)} principal arcs."
        ]
        
        # Identify "Standout Scene" for executive summary
        if scenes:
            scene_counts = {s_id: len(elms) for s_id, elms in scenes.items()}
            complex_scene_id = max(scene_counts, key=scene_counts.get)
            exec_summary.append(f"Scene {complex_scene_id} identified as the narrative anchor due to its high density of character beats.")

        analysis_report = {
            "executive_summary": exec_summary,
            "scenes": self._analyze_scenes(scenes),
            "character_insights": characters,
            "production_notes": self._analyze_production_constraints(elements, lang_context),
            "visual_shot_list": self._generate_shot_suggestions(scenes),
            "critical_path": self._generate_critical_path(elements, lang_context)
        }
        
        return analysis_report

    def _group_by_scene(self, elements: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        scenes = {}
        for el in elements:
            s_id = el.get("scene_id", 0)
            if s_id not in scenes:
                scenes[s_id] = []
            scenes[s_id].append(el)
        return scenes

    def _analyze_scenes(self, scenes: Dict[int, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        report_scenes = []
        for s_id, elms in scenes.items():
            heading = next((e["text"] for e in elms if e["type"] == "heading"), f"SCENE {s_id}")
            actions = [e["text"] for e in elms if e["type"] == "action"]
            dialogue = [e["text"] for e in elms if e["type"] == "character"] # Using character as dialogue marker
            
            # Context Extraction
            all_text = " ".join([e["text"] for e in elms]).lower()
            
            # 1. Dynamic Summary
            verbs = self._extract_dominant_verbs(all_text)
            char_presence = []
            seen = set()
            for e in elms:
                if e["type"] == "character" and e["text"] not in seen:
                    char_presence.append(e["text"])
                    seen.add(e["text"])
            
            if char_presence:
                summary = f"{', '.join(char_presence[:2])} engage in {verbs if verbs else 'a pivotal moment'}."
            else:
                summary = f"Atmospheric sequence focusing on {verbs if verbs else 'the environment'}."

            # 2. Dynamic Strengths & Weaknesses
            strengths = []
            if len(dialogue) > 5: strengths.append("Strong rhythmic dialogue hooks")
            if "eyes" in all_text or "look" in all_text: strengths.append("Clear visual subtext opportunities")
            if not strengths: strengths = ["Focused narrative intent", "Efficient scene setup"]

            weaknesses = []
            if len(elms) > 20: weaknesses.append("Potential pacing bloat - consider tightening transitions")
            if len(dialogue) < 2 and len(actions) > 5: weaknesses.append("Heavy reliance on non-verbal cues (check blocking clarity)")
            if not weaknesses: weaknesses = ["Minimal structural friction"]

            # 3. Dynamic Shots
            shots = ["Establishing Shot"]
            if any(k in all_text for k in ["shout", "angry", "gussa", "scream", "cry", "rona", "kobam"]): shots.append("Tight Close-Up (Intensity)")
            if len(char_presence) > 1: shots.append("Two-Shot Master")
            if any(k in all_text for k in ["look", "see", "parthu"]): shots.append("POV Shift")
            
            # 4. Prop Detection
            props = self._detect_props(all_text)

            report_scenes.append({
                "scene_number": s_id,
                "heading": heading,
                "summary": summary,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "suggested_shots": shots[:4],
                "suggested_blocking": [f"Center on {char_presence[0] if char_presence else 'the main subject'}", "Utilize depth for power dynamics"],
                "locations": [heading],
                "props": props if props else ["Standard set pieces"]
            })
        return report_scenes

    def _extract_dominant_verbs(self, text: str) -> str:
        for category, words in self.action_keywords.items():
            for w in words:
                if w in text:
                    return f"{category}-driven interaction"
        return ""

    def _detect_props(self, text: str) -> List[str]:
        common_props = ["phone", "gun", "glass", "letter", "bag", "key", "mobile", "glass", "chashma", "kaththi"]
        detected = []
        for p in common_props:
            if p in text:
                detected.append(p.capitalize())
        return list(set(detected))

    def _analyze_characters(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        char_elements = [e["text"] for e in elements if e["type"] == "character"]
        character_names = sorted(list(set(char_elements)))
        all_text = " ".join([e["text"] for e in elements]).lower()
        
        insights = []
        for name in character_names:
            occurrences = char_elements.count(name)
            # Find associated actions for this character
            char_context = []
            for i, e in enumerate(elements):
                if e["text"] == name and i + 1 < len(elements):
                    char_context.append(elements[i+1]["text"])
            
            context_str = " ".join(char_context).lower()
            motive = "Seeking control" if any(w in context_str for w in ["want", "must", "need", "chahiye"]) else "Reactive survival"
            
            insights.append({
                "name": name,
                "arc": "Protagonist" if occurrences > (len(char_elements) * 0.3) else "Supporting Catalyst",
                "subtext_notes": ["High linguistic dominant" if occurrences > 10 else "Subtle presence"],
                "key_motives": [motive]
            })
        return insights

    def _generate_critical_path(self, elements: List[Dict[str, Any]], lang: str) -> List[str]:
        path = [f"Audit {lang} dialogue for subtextual accuracy."]
        if len(elements) > 100:
            path.append("Review Act 2 transition for potential pacing drag.")
        return path

    def _analyze_production_constraints(self, elements: List[Dict[str, Any]], lang_context: str) -> Dict[str, Any]:
        locations = list(set(e["text"] for e in elements if e["type"] == "heading"))
        return {
            "locations": locations,
            "set_pieces": ["Key environment markers identified from headings"],
            "props": self._detect_props(" ".join([e["text"] for e in elements])),
            "wardrobe": [f"Context-specific {lang_context} wardrobe"],
            "estimated_budget_tier": "Regional Professional" if lang_context != "English" else "Mid-Tier"
        }

    def _generate_shot_suggestions(self, scenes: Dict[int, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        # This is a global summary, specifically scene-aligned lists are inside _analyze_scenes
        return [
            {"type": "Character Master", "description": "Establish the ensemble geography."},
            {"type": "Visual Anchor", "description": "Close-up on key narrative props identified."}
        ]

script_analysis_service = ScriptAnalysisService()
