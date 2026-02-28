"""
Execution Service - Business logic for code execution behavioral analysis
Separates execution analysis logic from API endpoint layer
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ExecutionResult:
    """Data class for execution results (language-agnostic)"""
    def __init__(
        self,
        status: str,
        output: str,
        error: str = "",
        execution_time: float = 0.0,
        exit_code: int = 0,
        test_results: Optional[List[Dict]] = None
    ):
        self.status = status  # "success", "error", "timeout", "failed_tests"
        self.output = output
        self.error = error
        self.execution_time = execution_time
        self.exit_code = exit_code
        self.test_results = test_results or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "execution_time": round(self.execution_time, 3),
            "exit_code": self.exit_code,
            "test_results": self.test_results
        }


class ExecutionService:
    """
    Service for analyzing execution behavior and storing execution events.
    
    Integrates with behavioral monitoring system to provide context for:
    - Cognitive State Differentiation (Figure 8): last_run_was_error
    - Iteration Quality Assessment (Figure 7): run intervals
    """
    
    @staticmethod
    def analyze_execution_behavior(
        result_status: str,
        execution_time: float,
        telemetry: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze execution in context of behavioral monitoring.
        
        Args:
            result_status: Execution status ("success" or "error")
            execution_time: Time taken for execution in seconds
            telemetry: Optional telemetry data with last run timestamp
            
        Returns:
            Dictionary of behavioral flags for Data Fusion Engine
        """
        if not telemetry:
            return {}
        
        flags = {
            "last_run_was_error": result_status == "error",
            "execution_time": execution_time,
            "timestamp": datetime.now().isoformat()
        }
        
        # Calculate run interval if available
        if "last_run_timestamp" in telemetry:
            try:
                last_run = datetime.fromisoformat(telemetry["last_run_timestamp"])
                interval = (datetime.now() - last_run).total_seconds()
                flags["last_run_interval_seconds"] = interval
                
                # Flag rapid-fire attempts (< 10 seconds, as per thesis)
                if interval < 10:
                    flags["rapid_iteration"] = True
            except Exception as e:
                logger.warning(f"Failed to calculate run interval: {e}")
        
        return flags

