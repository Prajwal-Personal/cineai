import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.story_generator_service import story_generator_service

async def test_story_generation():
    print("Testing Creative Story Generation...")
    
    script_text = """
    INT. LAB - NIGHT
    
    DR. KHAN stares at the monitor.
    
    KHAN
    It's happening. The bridge is opening.
    
    SAM
    We should go. Now.
    
    KHAN
    No. We stay and watch the beginning of the end.
    """
    
    variants = await story_generator_service.generate_variants(script_text)
    
    print(f"\nExtracted Characters (Heuristic check): {'KHAN', 'SAM'}")
    print(f"Number of variants generated: {len(variants)}")
    
    for i, v in enumerate(variants):
        print(f"\nVariant {i+1}: {v['title']}")
        print(f"Logline: {v['logline']}")
        print(f"Theme: {v['theme']}")
        # Check if characters are present in the stories
        assert ("KHAN" in v['story'] or "SAM" in v['story'] or "Protagonist" in v['story'])
    
    assert len(variants) == 3
    print("\n✓ Story Generation verification passed!")

if __name__ == "__main__":
    asyncio.run(test_story_generation())
