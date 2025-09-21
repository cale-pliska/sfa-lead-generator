"""Blueprint registrations for the generate_contacts feature."""

from .pages import pages_bp
from .simple_method import (
    simple_step1_bp,
    simple_step2_bp,
    simple_step3_bp,
)
from .guess_method import (
    guess_step1_bp,
    guess_step2_bp,
    guess_step3_bp,
)

__all__ = [
    "pages_bp",
    "simple_step1_bp",
    "simple_step2_bp",
    "simple_step3_bp",
    "guess_step1_bp",
    "guess_step2_bp",
    "guess_step3_bp",
]
