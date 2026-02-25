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
    # Intervention is triggered based solely on cognitive state, not provenance
    INTERVENTION_URGENCY = {
        "Active": 0,                    # No intervention needed
        "Reflective Pause": 1,          # Low urgency
        "Passive Idle": 2,              # Medium urgency
        "Disengagement": 3,             # HIGH urgency - active intervention
    }
    
    @classmethod
    def should_intervene(cls, cognitive_state: str) -> bool:
        """
        Determine if proactive intervention is needed based on cognitive state.
        
        Args:
            cognitive_state: From FusionInsights.cognitive_state
            
        Returns:
            True if AI should proactively help (high urgency states)
        """
        urgency = cls.INTERVENTION_URGENCY.get(cognitive_state, 0)
        return urgency >= 2  # Intervene on medium-high urgency
    
    @classmethod
    def get_intervention_tone(cls, cognitive_state: str) -> str:
        """Get appropriate tone for intervention"""
        if cognitive_state == "Disengagement":
            return "encouraging_and_concrete"
        elif cognitive_state == "Passive Idle":
            return "gentle_nudge"
        else:
            return "supportive"
