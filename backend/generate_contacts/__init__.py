"""Blueprint registrations for the generate_contacts backend."""

from .step1 import step1_bp
from .step2 import step2_bp
from .step3 import step3_bp

__all__ = [
    "step1_bp",
    "step2_bp",
    "step3_bp",
]
