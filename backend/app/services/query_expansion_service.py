"""
Query Expansion Service for SmartCut AI
Provides LLM-like query understanding with synonym expansion, abbreviation handling,
and semantic term mapping for intelligent search.
"""
from typing import List, Dict, Set
import logging
import re

logger = logging.getLogger(__name__)


class QueryExpansionService:
    """
    Expands user queries with synonyms, abbreviations, and semantically related terms.
    Enables "FIR" to match "First Incident Report" and vice versa.
    """
    
    def __init__(self):
        # Abbreviation mappings (bidirectional)
        self.abbreviations = {
            # Legal/Police terms
            "fir": ["first information report", "first incident report", "police report", "complaint"],
            "cctv": ["closed circuit television", "security camera", "surveillance", "camera footage"],
            "rto": ["regional transport office", "vehicle registration", "transport office"],
            "dmv": ["department of motor vehicles", "motor vehicles", "vehicle registration"],
            
            # Technical terms
            "ui": ["user interface", "interface", "screen", "display"],
            "ux": ["user experience", "experience", "usability"],
            "api": ["application programming interface", "interface", "endpoint"],
            "db": ["database", "data storage", "storage"],
            "ai": ["artificial intelligence", "machine learning", "neural", "intelligent"],
            "ml": ["machine learning", "learning", "model", "training"],
            
            # Video/Media terms
            "hd": ["high definition", "1080p", "high quality", "hq"],
            "4k": ["ultra hd", "uhd", "2160p", "ultra high definition"],
            "fps": ["frames per second", "frame rate", "framerate"],
            "vfx": ["visual effects", "effects", "cgi", "special effects"],
            "sfx": ["sound effects", "audio effects", "effects"],
            
            # Common abbreviations
            "asap": ["as soon as possible", "urgent", "immediately", "quickly"],
            "etc": ["et cetera", "and so on", "and more"],
            "vs": ["versus", "against", "compared to", "vs"],
            "info": ["information", "details", "data"],
            "pic": ["picture", "photo", "image", "photograph"],
            "vid": ["video", "clip", "footage", "recording"],
        }
        
        # Synonym groups (all terms in a group should match each other)
        self.synonym_groups = [
            # Emotions
            ["happy", "joyful", "cheerful", "delighted", "pleased", "glad", "content", "elated"],
            ["sad", "unhappy", "sorrowful", "melancholy", "depressed", "gloomy", "dejected"],
            ["angry", "furious", "enraged", "irate", "mad", "upset", "annoyed", "irritated"],
            ["scared", "afraid", "frightened", "terrified", "fearful", "nervous", "anxious"],
            ["surprised", "shocked", "amazed", "astonished", "startled", "stunned"],
            
            # Actions
            ["walk", "walking", "stroll", "stride", "pace", "march"],
            ["run", "running", "sprint", "dash", "jog", "rush"],
            ["talk", "talking", "speak", "speaking", "chat", "converse", "discuss"],
            ["fight", "fighting", "battle", "combat", "conflict", "brawl", "scuffle"],
            
            # Scene types
            ["indoor", "inside", "interior", "indoors"],
            ["outdoor", "outside", "exterior", "outdoors", "open air"],
            ["night", "nighttime", "dark", "evening", "nocturnal"],
            ["day", "daytime", "daylight", "morning", "afternoon"],
            
            # People
            ["person", "people", "individual", "human", "someone", "somebody"],
            ["man", "male", "guy", "gentleman", "fellow"],
            ["woman", "female", "lady", "girl"],
            ["child", "kid", "children", "kids", "minor", "youth"],
            
            # Objects
            ["car", "vehicle", "automobile", "auto", "motor vehicle"],
            ["phone", "mobile", "cellphone", "cell phone", "smartphone", "telephone"],
            ["computer", "laptop", "pc", "desktop", "workstation"],
            
            # Document/Report terms
            ["report", "document", "file", "record", "documentation"],
            ["incident", "event", "occurrence", "happening", "situation"],
            ["complaint", "grievance", "issue", "problem", "concern"],
            
            # Video quality/description
            ["clear", "crisp", "sharp", "high quality", "hd"],
            ["blurry", "fuzzy", "unclear", "out of focus", "hazy"],
            ["loud", "noisy", "high volume", "audible"],
            ["quiet", "silent", "muted", "soft", "low volume"],
        ]
        
        # Build reverse mapping for fast lookup
        self._synonym_map = self._build_synonym_map()
        self._abbr_expanded = self._build_abbreviation_map()
    
    def _build_synonym_map(self) -> Dict[str, Set[str]]:
        """Build a mapping from each term to all its synonyms."""
        syn_map = {}
        for group in self.synonym_groups:
            group_set = set(group)
            for term in group:
                if term not in syn_map:
                    syn_map[term] = set()
                syn_map[term].update(group_set)
        return syn_map
    
    def _build_abbreviation_map(self) -> Dict[str, Set[str]]:
        """Build bidirectional abbreviation mapping."""
        abbr_map = {}
        for abbr, expansions in self.abbreviations.items():
            # Abbreviation -> expansions
            if abbr not in abbr_map:
                abbr_map[abbr] = set()
            abbr_map[abbr].update(expansions)
            abbr_map[abbr].add(abbr)
            
            # Expansion -> abbreviation (for reverse lookup)
            for exp in expansions:
                exp_lower = exp.lower()
                if exp_lower not in abbr_map:
                    abbr_map[exp_lower] = set()
                abbr_map[exp_lower].add(abbr)
                abbr_map[exp_lower].add(exp_lower)
        
        return abbr_map
    
    def expand_query(self, query: str) -> Dict[str, any]:
        """
        Expand a query with synonyms and abbreviation expansions.
        
        Returns:
            Dict with:
                - original: Original query
                - expanded_terms: List of all expanded/related terms
                - all_search_terms: Combined set of terms to search
                - expansion_reasoning: Why terms were expanded
        """
        original = query.strip()
        query_lower = original.lower()
        words = re.findall(r'\b\w+\b', query_lower)
        
        expanded_terms = set(words)
        expansion_reasoning = []
        
        for word in words:
            # Check abbreviations
            if word in self._abbr_expanded:
                related = self._abbr_expanded[word]
                expanded_terms.update(related)
                expansion_reasoning.append(f"'{word}' expanded to: {', '.join(related)}")
            
            # Check synonyms
            if word in self._synonym_map:
                synonyms = self._synonym_map[word]
                expanded_terms.update(synonyms)
                expansion_reasoning.append(f"'{word}' synonyms: {', '.join(synonyms)}")
        
        # Also check for multi-word phrases
        for abbr, expansions in self.abbreviations.items():
            for expansion in expansions:
                if expansion.lower() in query_lower:
                    expanded_terms.add(abbr)
                    expanded_terms.add(expansion.lower())
                    expansion_reasoning.append(f"'{expansion}' maps to abbreviation '{abbr}'")
        
        return {
            "original": original,
            "expanded_terms": list(expanded_terms),
            "all_search_terms": expanded_terms,
            "expansion_reasoning": expansion_reasoning,
            "query_words": words
        }
    
    def get_emotion_mappings(self, query: str) -> List[str]:
        """
        Extract and expand emotion-related terms from query.
        Returns list of emotion labels that match the query.
        """
        emotion_keywords = {
            "joy": ["happy", "joyful", "cheerful", "delighted", "excited", "fun", "funny", "comedy", "laugh"],
            "sadness": ["sad", "unhappy", "depressed", "melancholy", "gloomy", "tragic", "cry", "tears"],
            "anger": ["angry", "furious", "mad", "enraged", "frustrated", "tense", "intense", "fight"],
            "fear": ["scared", "afraid", "frightened", "terrified", "horror", "scary", "creepy", "nervous"],
            "surprise": ["surprised", "shocked", "amazed", "unexpected", "twist", "reveal", "startled"],
            "disgust": ["disgusted", "gross", "revolting", "nasty", "ugly", "weird"],
            "analytical": ["technical", "analytical", "screen", "recording", "tutorial", "demo", "code"],
            "thoughtful": ["thoughtful", "pensive", "contemplating", "interview", "discussion", "talk"],
        }
        
        query_lower = query.lower()
        matched_emotions = []
        
        for emotion, keywords in emotion_keywords.items():
            for kw in keywords:
                if kw in query_lower:
                    matched_emotions.append(emotion)
                    break
        
        return matched_emotions
    
    def similarity_score(self, query_terms: Set[str], target_text: str) -> float:
        """
        Calculate how well target text matches the expanded query terms.
        Returns a score from 0.0 to 1.0.
        """
        if not query_terms or not target_text:
            return 0.0
        
        target_lower = target_text.lower()
        target_words = set(re.findall(r'\b\w+\b', target_lower))
        
        # Direct word matches
        direct_matches = len(query_terms.intersection(target_words))
        
        # Substring matches (for multi-word terms)
        substring_matches = sum(1 for term in query_terms if term in target_lower and term not in target_words)
        
        total_matches = direct_matches + (substring_matches * 0.5)
        max_possible = len(query_terms)
        
        if max_possible == 0:
            return 0.0
        
        return min(1.0, total_matches / max_possible)


# Singleton instance
query_expansion_service = QueryExpansionService()
