
import sys
import os
import traceback

# Add current dir to path
sys.path.append(os.getcwd())

def apply_pydantic_patch():
    try:
        import pydantic.v1.main
        from typing import Any
        original_new = pydantic.v1.main.ModelMetaclass.__new__
        def patched_new(mcs, name, bases, namespace, **kwargs):
            annotations = namespace.get('__annotations__', {})
            for key, value in namespace.items():
                if not key.startswith('_') and key not in annotations and not callable(value):
                    annotations[key] = Any
            namespace['__annotations__'] = annotations
            return original_new(mcs, name, bases, namespace, **kwargs)
        pydantic.v1.main.ModelMetaclass.__new__ = patched_new
        
        import pydantic.v1.fields
        original_set_type = pydantic.v1.fields.ModelField._set_default_and_type
        def patched_set_type(self):
            try: return original_set_type(self)
            except Exception:
                self.type_ = Any
                self.outer_type_ = Any
        pydantic.v1.fields.ModelField._set_default_and_type = patched_set_type
        print("Patch applied.")
    except Exception as e:
        print(f"Patch failed: {e}")

# Apply patch first
apply_pydantic_patch()

with open('repro_detailed_output.txt', 'w', encoding='utf-8') as f:
    f.write("--- Detailed Repro Start ---\n")
    try:
        f.write("Importing app.main...\n")
        from app.main import app
        f.write("Success!\n")
    except Exception as e:
        f.write(f"\nCaught: {type(e).__name__}: {e}\n")
        traceback.print_exc(file=f)
    f.write("\n--- Detailed Repro End ---\n")

print("Repro finished. Check repro_detailed_output.txt")
