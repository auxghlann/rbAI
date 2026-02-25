"""
Execution Service Client
Client for calling the remote execution microservice
"""

import httpx
import logging
import os
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class ExecutionServiceClient:
    """
    Client for rbAI Execution Microservice
    
    Calls the remote execution service via HTTP API
    Falls back to local execution in development
    """
    
    def __init__(self):
        """Initialize client with service URL and API key"""
        self.service_url = os.getenv(
            'EXECUTION_SERVICE_URL',
            'http://localhost:8080'  # Local development default
        )
        self.api_key = os.getenv('EXECUTION_API_KEY', 'dev-key-change-in-production')
        self.timeout = 60.0  # 60 seconds for code execution
        
        logger.info(f"Execution service configured: {self.service_url}")
    
    async def execute_code(
        self,
        code: str,
        language: str = "python",
        stdin: str = "",
        timeout: int = 30,
        test_cases: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Execute code via remote execution service
        
        Args:
            code: Source code to execute
            language: Programming language (python, java, etc.)
            stdin: Standard input
            timeout: Execution timeout in seconds
            test_cases: Optional test cases for validation
            
        Returns:
            Execution result dictionary with output, errors, etc.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.service_url}/execute",
                    json={
                        "code": code,
                        "language": language,
                        "stdin": stdin,
                        "timeout": timeout,
                        "test_cases": test_cases
                    },
                    headers={"X-API-Key": self.api_key}
                )
                
                if response.status_code == 401:
                    logger.error("Execution service authentication failed")
                    return {
                        "success": False,
                        "status": "error",
                        "output": "",
                        "error": "Execution service authentication failed",
                        "execution_time": 0.0,
                        "exit_code": -1
                    }
                
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error("Execution service timeout")
            return {
                "success": False,
                "status": "timeout",
                "output": "",
                "error": f"Execution service timed out after {self.timeout} seconds",
                "execution_time": self.timeout,
                "exit_code": -1
            }
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to execution service: {e}")
            return {
                "success": False,
                "status": "error",
                "output": "",
                "error": f"Failed to connect to execution service: {str(e)}",
                "execution_time": 0.0,
                "exit_code": -1
            }
        except Exception as e:
            logger.error(f"Execution service error: {e}", exc_info=True)
            return {
                "success": False,
                "status": "error",
                "output": "",
                "error": f"Execution service error: {str(e)}",
                "execution_time": 0.0,
                "exit_code": -1
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check if execution service is available
        
        Returns:
            Health status dictionary
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.service_url}/health")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.warning(f"Execution service health check failed: {e}")
            return {
                "status": "unavailable",
                "error": str(e)
            }
    
    async def get_supported_languages(self) -> List[str]:
        """
        Get list of supported languages from execution service
        
        Returns:
            List of supported language names
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.service_url}/languages")
                response.raise_for_status()
                data = response.json()
                return data.get("languages", ["python"])
        except Exception as e:
            logger.warning(f"Failed to get supported languages: {e}")
            return ["python"]  # Fallback


# Global client instance
execution_client = ExecutionServiceClient()
