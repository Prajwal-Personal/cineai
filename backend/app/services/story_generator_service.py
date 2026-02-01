from typing import List, Dict, Any
import re
import random

class StoryGeneratorService:
    def __init__(self):
        self.themes = {
            "thriller": ["Dark Noir", "Techno-Paranoia", "Psychological Suspense"],
            "drama": ["Family Legacy", "Forbidden Romance", "Social commentary"],
            "sci-fi": ["Cyberpunk", "Space Opera", "Dystopian Future"],
            "mystery": ["Locked Room", "Whodunit", "Cold Case"]
        }
        
        self.twist_templates = [
            "What if {char1} was actually an undercover agent working for {char2}'s greatest rival?",
            "In this version, {char1} discovers that the entire conflict was a simulation designed by {char2}.",
            "A supernatural twist: {char1} realizes they have been a ghost all along, and only {char2} can see them.",
            "The setting shifts to a post-apocalyptic wasteland where {char1} and {char2} must protect the last remaining seed of life.",
            "A 'Rashomon' style retelling where we see the scene from {char1}'s perspective first, then {char2}'s, revealing a hidden truth."
        ]

    async def generate_variants(self, script_text: str) -> List[Dict[str, Any]]:
        """
        Generates creative story variants using extracted character and theme data.
        """
        # 1. Extract Characters (Heuristic)
        # Look for words in ALL CAPS at the start of lines or preceded by dialogue-like markers
        characters = list(set(re.findall(r'^[A-Z\u0900-\u097F\u0B80-\u0BFF]{2,}', script_text, re.MULTILINE)))
        
        # 2. Extract Primary Theme/Mood
        mood = "Drama"
        if any(w in script_text.lower() for w in ["gun", "weapon", "kill", "dead", "gussa", "kobam"]):
            mood = "Thriller"
        elif any(w in script_text.lower() for w in ["love", "heart", "pyaar", "ishq"]):
            mood = "Romance"
        elif any(w in script_text.lower() for w in ["cyber", "system", "tech", "binary"]):
            mood = "Sci-Fi"

        # 3. Generate 3 Unique Variants
        variants = []
        
        # Ensure we have at least 2 char placeholders
        c1 = characters[0] if len(characters) > 0 else "The Protagonist"
        c2 = characters[1] if len(characters) > 1 else "The Mysterious Stranger"

        # Variant 1: Genre Shift
        genres = ["Cyberpunk Noir", "Historical Epic", "Surrealist Dreamscape"]
        genre = random.choice(genres)
        variants.append({
            "title": f"The {genre} Reimagining",
            "logline": f"Recontextualizing the conflict between {c1} and {c2} in a {genre.lower()} setting.",
            "story": f"In a world where {self._get_world_desc(genre)}, {c1} must confront {c2} over the {mood.lower()} that binds them. Every word spoken carries the weight of a dying sun.",
            "theme": genre
        })

        # Variant 2: The Twist
        twist = random.choice(self.twist_templates).format(char1=c1, char2=c2)
        variants.append({
            "title": "The Hidden Truth (Twist Variant)",
            "logline": "A narrative pivot that changes everything you thought you knew.",
            "story": twist + f" This revelation forces {c1} to reconsider their entire journey and the loyalty they owe to {c2}.",
            "theme": "Explosive Twist"
        })

        # Variant 3: Emotional Inversion
        variants.append({
            "title": "Shadow & Light (Inversion)",
            "logline": "Swap the emotional polarity of the original scene.",
            "story": f"If the original was {mood.lower()}, this version plays it as a pitch-black comedy. {c1}'s deepest fears become {c2}'s source of amusement, leading to a tragic yet absurd resolution.",
            "theme": "Emotional Contrast"
        })

        return variants

    def _get_world_desc(self, genre: str) -> str:
        descs = {
            "Cyberpunk Noir": "neon rain slicked streets hide digital ghosts",
            "Historical Epic": "the dust of empires clashing chokes the air",
            "Surrealist Dreamscape": "physics is a suggestion and memories bleed into reality"
        }
        return descs.get(genre, "the stakes are impossibly high")

story_generator_service = StoryGeneratorService()
