from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class ScoringService:
    def __init__(self):
        # Director's 7-Pillar Weights
        self.weights = {
            "performance": 0.25,
            "story_clarity": 0.20,
            "coverage": 0.15,
            "technical": 0.15,
            "tone_rhythm": 0.10,
            "instinct": 0.05,
            "edit_imagination": 0.10
        }

    def compute_take_score(self, cv_data: Dict, audio_data: Dict, nlp_data: Dict) -> Dict[str, Any]:
        """
        Calculates a 7-pillar weighted score mapping to the Director's 7-step framework.
        """
        nlp_sim = nlp_data.get("similarity", 0) * 100
        nlp_intensity = nlp_data.get("intensity", 0.5) * 100
        tech_score = cv_data.get("technical_score", 50)
        audio_score = audio_data.get("quality_score", 50)
        duration = cv_data.get("duration", 10)
        has_objects = len(cv_data.get("objects", [])) > 3
        
        # 1. Performance (Truthfulness, Beats, Arc)
        p_perf = (nlp_sim * 0.4) + (nlp_intensity * 0.4) + (20 if nlp_sim > 80 else 10)
        c_perf = "Emotional beats read clearly; performance feels truthful." if p_perf > 75 else \
                 "Performance feels forced or flat. Actors may be missing the subtext or timing."

        # 2. Story Clarity (First-time viewer understanding)
        p_clarity = (nlp_sim * 0.7) + (30 if has_objects else 10)
        c_clarity = "Key story points are visually clear and obvious." if p_clarity > 75 else \
                    "Story intent is muddied. A first-time viewer might find the scene confusing."

        # 3. Coverage (Angles, Eyelines, Continuity)
        p_coverage = min(100, (tech_score * 0.5) + (len(cv_data.get("objects", [])) * 8))
        c_coverage = "Strong coverage detected with clear eyeline matches." if p_coverage > 70 else \
                     "Possible coverage gaps. Eyelines or blocking may limit editing options."

        # 4. Technical Quality (Focus, Sound, Light)
        p_tech = (tech_score * 0.6) + (audio_score * 0.4)
        c_tech = "Technical quality is broadcast-ready." if p_tech > 80 else \
                 "Critical technical failures in focus, lighting, or acoustic clarity."

        # 5. Tone & Rhythm (Consistency, Pacing)
        pacing = 90 if 10 < duration < 40 else 60
        p_tone = (pacing * 0.7) + (tech_score * 0.3)
        c_tone = "Pacing and tone are consistent with the narrative arc." if p_tone > 80 else \
                 "Tone feels off; the rhythm drags or rushes the emotional beat."

        # 6. Instinct (The "Yes, that's it" feeling)
        p_instinct = (p_perf + p_tech + p_clarity) / 3
        c_instinct = "The scene lands. It has the 'right' feeling." if p_instinct > 80 else \
                     "Something feels off instinctively—the scene doesn't quite 'land'."

        # 7. Edit Imagination (Cutability, Shaping)
        p_edit = (p_coverage * 0.6) + (p_tech * 0.4)
        c_edit = "Editor has multiple options to shape the performance." if p_edit > 75 else \
                 "Limited options; the editor will struggle to 'save' this in post."

        # Total Weighted Calculation
        total_score = (
            (p_perf * self.weights["performance"]) +
            (p_clarity * self.weights["story_clarity"]) +
            (p_coverage * self.weights["coverage"]) +
            (p_tech * self.weights["technical"]) +
            (p_tone * self.weights["tone_rhythm"]) +
            (p_instinct * self.weights["instinct"]) +
            (p_edit * self.weights["edit_imagination"])
        )

        pillars = {
            "performance": round(p_perf, 1),
            "story_clarity": round(p_clarity, 1),
            "coverage": round(p_coverage, 1),
            "technical": round(p_tech, 1),
            "tone_rhythm": round(p_tone, 1),
            "instinct": round(p_instinct, 1),
            "edit_imagination": round(p_edit, 1)
        }

        critiques = {
            "performance": c_perf,
            "story_clarity": c_clarity,
            "coverage": c_coverage,
            "technical": c_tech,
            "tone": c_tone,
            "instinct": c_instinct,
            "editability": c_edit
        }

        # Select the most critical note
        fault_order = ["technical", "performance", "story_clarity", "coverage", "editability", "tone", "instinct"]
        summary_note = critiques["instinct"]
        for p in fault_order:
            val_key = p if p not in ["tone", "editability"] else "tone_rhythm" if p=="tone" else "edit_imagination"
            if pillars[val_key] < 80:
                crit_key = "tone" if p=="tone" else "editability" if p=="editability" else p
                summary_note = critiques[crit_key]
                break

        return {
            "total_score": round(total_score, 1),
            "pillars": pillars,
            "critiques": critiques,
            "summary": f"Director's Rating: {round(total_score, 1)}%. Final Assessment: {summary_note}"
        }

scoring_service = ScoringService()
