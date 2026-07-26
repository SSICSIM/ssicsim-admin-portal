from typing import Any
from datetime import datetime
from pydantic import GetCoreSchemaHandler, ValidationInfo
from pydantic_core import core_schema

# Try to import driver classes for creation fallback
try:
    from psycopg.types.range import Range as Psycopg3Range
except ImportError:
    Psycopg3Range = None

try:
    from psycopg2.extras import DateTimeTZRange
except ImportError:
    DateTimeTZRange = None

class PydanticDateTimeTZRange:
    """A bulletproof Pydantic wrapper that accepts any range-like object."""
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        
        def validate(value: Any, info: ValidationInfo) -> Any:
            # 1. DUCK TYPING CHECK (Solves your issue):
            # If it already has lower/upper properties, it's a range object from the DB!
            if hasattr(value, "lower") and hasattr(value, "upper"):
                return value
                
            # 2. Handle shorthand arrays from curl/JSON: [start, end]
            if isinstance(value, (list, tuple)) and len(value) == 2:
                lower_val, upper_val = value[0], value[1]
                if Psycopg3Range:
                    return Psycopg3Range(lower_val, upper_val, bounds="[)")
                if DateTimeTZRange:
                    return DateTimeTZRange(lower_val, upper_val, bounds="[)")
                return value # Fallback if no driver is present locally
                
            # 3. Handle full JSON dictionary payloads
            if isinstance(value, dict):
                lower_val = value.get("lower")
                upper_val = value.get("upper")
                bounds_val = value.get("bounds", "[)")
                if Psycopg3Range:
                    return Psycopg3Range(lower_val, upper_val, bounds=bounds_val)
                if DateTimeTZRange:
                    return DateTimeTZRange(lower_val, upper_val, bounds=bounds_val)
                return value
                
            raise ValueError(f"Invalid format for TSTZRANGE object. Got type: {type(value)}")

        def serialize(value: Any) -> dict:
            # Safely fetch properties regardless of which underlying driver created it
            lower_attr = getattr(value, "lower", None)
            upper_attr = getattr(value, "upper", None)
            bounds_attr = getattr(value, "bounds", "[)")
            
            return {
                "lower": lower_attr.isoformat() if isinstance(lower_attr, datetime) else lower_attr,
                "upper": upper_attr.isoformat() if isinstance(upper_attr, datetime) else upper_attr,
                "bounds": bounds_attr if bounds_attr else "[)"
            }

        return core_schema.json_or_python_schema(
            json_schema=core_schema.any_schema(),
            python_schema=core_schema.general_plain_validator_function(validate),
            serialization={
                "type": "function-plain",
                "function": serialize,
                "when_used": "always"
            }
        )
