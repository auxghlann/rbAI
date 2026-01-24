"""
Policy definitions for scope validation and content filtering.
Defines what's in-scope vs out-of-scope for the pedagogical firewall.
"""


class ScopePolicy:
    """
    Defines what the AI tutor can and cannot help with.
    
    Philosophy: Guide learning, never give solutions.
    All validation is handled through AI system prompt guardrails.
    """
    
    @classmethod
    def quick_filter(cls, user_query: str) -> tuple[bool, str]:
        """
        Minimal pre-filter: only check for empty queries.
        All validation (language, scope, content) is handled by AI via system prompt.
        
        Returns:
            (is_allowed, reason)
        """
        if not user_query or not user_query.strip():
            return False, "EMPTY_QUERY"
        
        # Let AI handle all validation through system prompt guardrails
        return True, "NEEDS_AI_VALIDATION"


class InterventionPolicy:
    """
    Defines when and how the AI should intervene based on behavioral state.
    
    Integrates with FusionInsights from behavior_engine.
    """
    
    # Map cognitive states to intervention urgency
    INTERVENTION_URGENCY = {
        "ACTIVE": 0,                    # No intervention needed
        "REFLECTIVE_PAUSE": 1,          # Low urgency
        "PASSIVE_IDLE": 2,              # Medium urgency
        "DISENGAGEMENT": 3,             # HIGH urgency - active intervention
    }
    
    # Map provenance states to teaching adjustments
    PROVENANCE_CONCERNS = {
        "SUSPECTED_PASTE": "Ask student to explain the code",
        "SPAMMING": "Encourage thoughtful edits over random changes",
        "AMBIGUOUS_EDIT": "Help student understand their large changes",
    }
    
    @classmethod
    def should_intervene(cls, cognitive_state: str, iteration_state: str) -> bool:
        """
        Determine if proactive intervention is needed.
        
        Args:
            cognitive_state: From FusionInsights.cognitive_state
            iteration_state: From FusionInsights.iteration_state
            
        Returns:
            True if AI should proactively help (high urgency states)
        """
        urgency = cls.INTERVENTION_URGENCY.get(cognitive_state, 0)
        
        # Also intervene on problematic iteration patterns
        if iteration_state in ["RAPID_GUESSING", "MICRO_ITERATION"]:
            urgency = max(urgency, 2)
        
        return urgency >= 2  # Intervene on medium-high urgency
    
    @classmethod
    def get_intervention_tone(cls, cognitive_state: str) -> str:
        """Get appropriate tone for intervention"""
        if cognitive_state == "DISENGAGEMENT":
            return "encouraging_and_concrete"
        elif cognitive_state == "PASSIVE_IDLE":
            return "gentle_nudge"
        else:
            return "supportive"
