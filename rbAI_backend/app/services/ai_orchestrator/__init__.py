"""
AI Orchestrator Module - Pedagogical Firewall for Learning Support

Provides Socratic tutoring while filtering out-of-scope requests.
Integrates with behavioral engine for context-aware interventions.
"""

from .firewall import PedagogicalFirewall
from .llm_client_groq import LLMClientGroq
from .activity_generator import ActivityGenerator

__all__ = ["PedagogicalFirewall", "LLMClientGroq", "ActivityGenerator"]
