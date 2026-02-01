
import sys
import os

# --- PRE-IMPORT MONKEYPATCH ---
def apply_pydantic_patch():
    try:
        # Patch 1: Metaclass to ensure all fields have annotations
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

        # Patch 2: ModelField to handle type inference failures
        import pydantic.v1.fields
        original_set_type = pydantic.v1.fields.ModelField._set_default_and_type
        def patched_set_type(self):
            try:
                return original_set_type(self)
            except Exception as e:
                if "unable to infer type" in str(e):
                    self.type_ = Any
                    self.outer_type_ = Any
                    return 
                raise e
        pydantic.v1.fields.ModelField._set_default_and_type = patched_set_type

        # Patch 3: Schema generation to bypass "unenforced field constraints" ValueErrors
        import pydantic.v1.schema
        original_get_annotation = pydantic.v1.schema.get_annotation_from_field_info
        def patched_get_annotation(annotation, field_info, name, validate_assignment):
            try:
                return original_get_annotation(annotation, field_info, name, validate_assignment)
            except ValueError as e:
                if "unenforced field constraints" in str(e):
                    return annotation
                raise e
        pydantic.v1.schema.get_annotation_from_field_info = patched_get_annotation

        print("✅ Ultimate Pydantic V1 monkeypatch applied successfully.")
    except Exception as e:
        print(f"⚠️ Failed to apply Pydantic patch: {e}")

# Apply the patch BEFORE anything else
apply_pydantic_patch()

# Add current dir to path
sys.path.append(os.getcwd())

if __name__ == "__main__":
    try:
        import uvicorn
        # Import app AFTER patching
        from app.main import app
        
        # CRITICAL FIX: Railway UI says Port 8000, but PORT env var is coming as 8080.
        # We MUST listen on 8000 to match the Load Balancer's expectation.
        # port = int(os.environ.get("PORT", 8000)) 
        
        target_port = 8000
        print(f"🚀 Starting SmartCut AI Backend on FIXED PORT: {target_port}")
        print(f"🔍 Python Executable: {sys.executable}")
        print(f"🔍 System Path: {sys.path}")
        
        if os.environ.get("PORT") and os.environ.get("PORT") != str(target_port):
            print(f"⚠️ WARNING: Ignoring PORT environment variable ({os.environ.get('PORT')}) to match Railway Config ({target_port})")

        uvicorn.run(app, host="0.0.0.0", port=target_port, log_level="debug")
    except Exception as e:
        print(f"🔥 FATAL ERROR DURING STARTUP: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
