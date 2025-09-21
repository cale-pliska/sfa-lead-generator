"""Blueprint registrations for the simple contact generation method."""

from .step1 import simple_step1_bp
from .step2 import simple_step2_bp
from .step3 import simple_step3_bp

__all__ = [
    "simple_step1_bp",
    "simple_step2_bp",
    "simple_step3_bp",
]
