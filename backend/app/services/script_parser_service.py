from docx import Document
from typing import List, Dict, Any
import re

class ScriptParserService:
    def __init__(self):
        # Traditional screenplay margins/formatting heuristics
        self.element_patterns = {
            "heading": r"^(INT\.|EXT\.|INT\/EXT\.|दृश्य|भीतर|बाहर|काட்சி|உள்|வெளி)",
            "transition": r"^(CUT TO:|FADE OUT\.|FADE IN:|दृश्य परिवर्तन|வெட்டு)",
            "character": r"^[A-Z\u0900-\u097F\u0B80-\u0BFF\s]+(\s\(.*\))?$", # Support Hindi & Tamil ranges
        }

    def parse_docx(self, file_path: str) -> List[Dict[str, Any]]:
        doc = Document(file_path)
        elements = []
        current_scene_id = 0
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            element_type = self._identify_element(para)
            
            if element_type == "heading":
                current_scene_id += 1
                
            elements.append({
                "type": element_type,
                "text": text,
                "scene_id": current_scene_id
            })
            
        return elements

    def _identify_element(self, para) -> str:
        text = para.text.strip()
        
        # Check patterns
        if re.match(self.element_patterns["heading"], text, re.IGNORECASE):
            return "heading"
        if re.match(self.element_patterns["transition"], text, re.IGNORECASE):
            return "transition"
            
        # Use indentation/alignment heuristics as secondary signals
        # (Standard docx might not have perfect styles, so we guess)
        alignment = para.alignment
        left_indent = para.paragraph_format.left_indent
        
        if text.isupper():
            # Likely a Heading or Character
            if re.match(self.element_patterns["heading"], text, re.IGNORECASE):
                return "heading"
            return "character"
            
        if text.startswith("(") and text.endswith(")"):
            return "parenthetical"
            
        # Default to action/dialogue depending on context
        # This is a simplified version; real screenplay parsers are more complex
        return "action" # Or dialogue if preceded by character

script_parser_service = ScriptParserService()
