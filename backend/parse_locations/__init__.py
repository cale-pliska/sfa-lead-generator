"""Blueprint registrations for the parse_locations feature."""

from .step1 import step1_bp
from .step2 import step2_bp
from .step3 import step3_bp
from .step4 import step4_bp

__all__ = [
    "step1_bp",
    "step2_bp",
    "step3_bp",
    "step4_bp",
]

