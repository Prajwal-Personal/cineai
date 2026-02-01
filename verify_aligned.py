import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.script_analysis_service import script_analysis_service

async def test_aligned_analysis():
    print("Testing Aligned Script Analysis...")
    
    # Scene 1: Intense conflict in Hindi with a prop (gun)
    elements = [
        {"type": "heading", "text": "दृश्य 1: भीतर - रात", "scene_id": 1},
        {"type": "character", "text": "RAHUL", "scene_id": 1},
        {"type": "action", "text": "Rahul screams in anger. He points a gun at the desk.", "scene_id": 1},
        {"type": "character", "text": "PRIYA", "scene_id": 1},
        {"type": "action", "text": "Priya cries and whispers for help.", "scene_id": 1},
        
        # Scene 2: Calm Tamil scene with a phone
        {"type": "heading", "text": "காட்சி 2: வெளி - பகல்", "scene_id": 2},
        {"type": "character", "text": "ANAND", "scene_id": 2},
        {"type": "action", "text": "Anand watches the sunset. He picks up his phone.", "scene_id": 2}
    ]
    
    try:
        report = await script_analysis_service.analyze_script(elements)
        
        print("\n--- DEBUG: FULL REPORT ---")
        import json
        print(json.dumps(report, indent=2))
        print("--- END DEBUG ---\n")
        
        # Verify Scene 1 Alignment
        s1 = report['scenes'][0]
        print(f"\nScene 1 ({s1['heading']}):")
        print(f"Summary: {s1['summary']}")
        print(f"Props: {s1['props']}")
        print(f"Shots: {s1['suggested_shots']}")
        
        assert "RAHUL" in s1['summary']
        assert "Gun" in s1['props']
        assert "Tight Close-Up (Intensity)" in s1['suggested_shots']
        
        # Verify Scene 2 Alignment
        s2 = report['scenes'][1]
        print(f"\nScene 2 ({s2['heading']}):")
        print(f"Summary: {s2['summary']}")
        print(f"Props: {s2['props']}")
        print(f"Shots: {s2['suggested_shots']}")
        
        assert "ANAND" in s2['summary']
        assert "Phone" in s2['props']
        assert "Tight Close-Up (Intensity)" not in s2['suggested_shots'] # Should be calm
        
        print("\n✓ Aligned Analysis verification passed!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_aligned_analysis())
