from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.script_parser_service import script_parser_service
from app.services.script_analysis_service import script_analysis_service
from app.services.story_generator_service import story_generator_service
import os
import shutil
from tempfile import NamedTemporaryFile
from pydantic import BaseModel

router = APIRouter()

class StoryRequest(BaseModel):
    text: str

@router.post("/generate-stories")
async def generate_stories(request: StoryRequest):
    if not request.text or len(request.text) < 10:
        raise HTTPException(status_code=400, detail="Script text is too short for meaningful analysis.")
    
    try:
        variants = await story_generator_service.generate_variants(request.text)
        return {
            "status": "success",
            "variants": variants
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_script(file: UploadFile = File(...)):
    if not file.filename.endswith(('.docx', '.doc')):
        raise HTTPException(status_code=400, detail="Only .docx files are supported.")
        
    try:
        # Save temp file
        with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
            
        # Parse
        elements = script_parser_service.parse_docx(tmp_path)
        
        # Analyze
        analysis = await script_analysis_service.analyze_script(elements)
        
        # Cleanup
        os.remove(tmp_path)
        
        return {
            "filename": file.filename,
            "status": "success",
            "analysis": analysis,
            "html_report": _generate_html_report(analysis)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _generate_html_report(analysis: dict) -> str:
    # Simple HTML generator for the user-readable report
    html = f"""
    <html>
    <head><style>
        body {{ font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }}
        h1, h2, h3 {{ color: #1a56db; }}
        .section {{ margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }}
        .scene {{ background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }}
        .tag {{ display: inline-block; background: #e5edff; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 5px; }}
    </style></head>
    <body>
        <h1>Script Analysis Report: Interactive Production Insights</h1>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <ul>
                {"".join(f"<li>{item}</li>" for item in analysis['executive_summary'])}
            </ul>
        </div>

        <div class="section">
            <h2>Scene-by-Scene Breakdown</h2>
            {"".join(f'''
                <div class="scene">
                    <h3>Scene {s['scene_number']}: {s['heading']}</h3>
                    <p><strong>Summary:</strong> {s['summary']}</p>
                    <p><strong>Strengths:</strong> {", ".join(s['strengths'])}</p>
                    <p><strong>Suggested Shots:</strong> {", ".join(s['suggested_shots'])}</p>
                    <p><strong>Staging:</strong> {", ".join(s['suggested_blocking'])}</p>
                </div>
            ''' for s in analysis['scenes'])}
        </div>

        <div class="section">
            <h2>Character Arcs</h2>
            {"".join(f'''
                <div>
                    <h3>{c['name']}</h3>
                    <p><strong>Arc:</strong> {c['arc']}</p>
                    <p><strong>Subtext:</strong> {"; ".join(c['subtext_notes'])}</p>
                </div>
            ''' for c in analysis['character_insights'])}
        </div>
        
        <div class="section">
            <h2>Production Notes</h2>
            <p><strong>Budget Tier:</strong> {analysis['production_notes']['estimated_budget_tier']}</p>
            <p><strong>Locations:</strong> {", ".join(analysis['production_notes']['locations'])}</p>
            <p><strong>Props:</strong> {", ".join(analysis['production_notes']['props'])}</p>
            <p><strong>Wardrobe:</strong> {", ".join(analysis['production_notes']['wardrobe'])}</p>
        </div>

    </body>
    </html>
    """
    return html
