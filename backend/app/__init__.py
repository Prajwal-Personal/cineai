import sys
from typing import Any

def apply_pydantic_patch():
    try:
        # Patch schema enforcement globally
        import pydantic.v1.schema
        if not hasattr(pydantic.v1.schema, '_is_patched_v4'):
            def patched_get_annotation(annotation, field_info, name, validate_assignment):
                return annotation
            pydantic.v1.schema.get_annotation_from_field_info = patched_get_annotation
            pydantic.v1.schema._is_patched_v4 = True
            
        # Patch ModelField.infer for extra safety
        import pydantic.v1.fields
        if not hasattr(pydantic.v1.fields.ModelField, '_is_patched_v4'):
            original_infer = pydantic.v1.fields.ModelField.infer
            @classmethod
            def patched_infer(cls, *args, **kwargs):
                try:
                    return original_infer(*args, **kwargs)
                except Exception:
                    kwargs['annotation'] = Any
                    return original_infer(*args, **kwargs)
            pydantic.v1.fields.ModelField.infer = patched_infer
            pydantic.v1.fields.ModelField._is_patched_v4 = True

        print("✅ Pydantic V1 Global Compatibility Patch Applied.")
    except Exception as e:
        print(f"⚠️ Patch failed: {e}")

apply_pydantic_patch()
