"""
Code executor for rbAI Execution Microservice
Handles Docker-based code execution with isolation and resource limits
"""

import docker
import asyncio
import time
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Result of code execution"""
    status: str  # "success", "error", "timeout"
    output: str
    error: str
    execution_time: float
    exit_code: int
    test_results: List[Dict[str, Any]]


class CodeExecutor:
    """
    Executes code in isolated Docker containers
    Supports: Python, Java (extensible to other languages)
    """
    
    # Language configurations
    LANGUAGE_CONFIGS = {
        "python": {
            "image": "python:3.10-alpine",
            "memory_limit": "128m",
            "cpu_quota": 50000,
            "extension": ".py",
            "cmd": ["python", "/code/main.py"]
        },
        "java": {
            "image": "eclipse-temurin:17-jdk-alpine",
            "memory_limit": "256m",
            "cpu_quota": 100000,
            "extension": ".java",
            "cmd": ["/bin/sh", "-c", "javac /code/Solution.java && java -cp /code Solution"]
        }
    }
    
    def __init__(self):
        """Initialize Docker client"""
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("✅ Docker client initialized")
        except docker.errors.DockerException as e:
            logger.error(f"❌ Docker initialization failed: {e}")
            self.client = None
    
    def check_docker_available(self) -> bool:
        """Check if Docker is available"""
        return self.client is not None
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return list(self.LANGUAGE_CONFIGS.keys())
    
    def pull_images(self):
        """Pull required Docker images"""
        if not self.client:
            return
        
        for lang, config in self.LANGUAGE_CONFIGS.items():
            try:
                logger.info(f"Pulling {lang} image: {config['image']}")
                self.client.images.pull(config['image'])
                logger.info(f"✅ {lang} image ready")
            except Exception as e:
                logger.warning(f"Failed to pull {lang} image: {e}")
    
    async def execute(
        self,
        code: str,
        language: str = "python",
        stdin: str = "",
        timeout: int = 30,
        test_cases: Optional[List[Dict]] = None
    ) -> ExecutionResult:
        """
        Execute code in isolated container
        
        Args:
            code: Source code to execute
            language: Programming language
            stdin: Standard input
            timeout: Execution timeout in seconds
            test_cases: Optional test cases for validation
            
        Returns:
            ExecutionResult with output, errors, and execution time
        """
        if not self.client:
            return ExecutionResult(
                status="error",
                output="",
                error="Docker is not available",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        
        language = language.lower()
        if language not in self.LANGUAGE_CONFIGS:
            return ExecutionResult(
                status="error",
                output="",
                error=f"Unsupported language: {language}",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        
        config = self.LANGUAGE_CONFIGS[language]
        
        # Prepare code based on language
        if language == "python":
            prepared_code = self._prepare_python_code(code, stdin)
        elif language == "java":
            prepared_code = self._prepare_java_code(code, stdin)
        else:
            prepared_code = code
        
        # Execute in container
        start_time = time.time()
        
        try:
            # Create container
            container = self.client.containers.create(
                image=config['image'],
                command=config['cmd'],
                mem_limit=config['memory_limit'],
                cpu_quota=config['cpu_quota'],
                network_disabled=True,
                read_only=False,
                detach=True,
                stdin_open=False,
                tty=False,
                # Mount code as volume
                volumes={
                    '/tmp': {'bind': '/code', 'mode': 'rw'}
                },
                working_dir='/code'
            )
            
            # Write code to container
            if language == "python":
                container.put_archive('/code', self._create_tar('main.py', prepared_code))
            elif language == "java":
                container.put_archive('/code', self._create_tar('Solution.java', prepared_code))
            
            # Start container
            container.start()
            
            # Wait for completion with timeout
            try:
                exit_code = container.wait(timeout=timeout)['StatusCode']
            except Exception:
                container.kill()
                container.remove(force=True)
                execution_time = time.time() - start_time
                return ExecutionResult(
                    status="timeout",
                    output="",
                    error=f"Execution timed out after {timeout} seconds",
                    execution_time=execution_time,
                    exit_code=-1,
                    test_results=[]
                )
            
            # Get logs
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
            
            # Cleanup
            container.remove(force=True)
            
            execution_time = time.time() - start_time
            
            # Determine status
            if exit_code == 0:
                status = "success"
            else:
                status = "error"
            
            return ExecutionResult(
                status=status,
                output=stdout,
                error=stderr,
                execution_time=execution_time,
                exit_code=exit_code,
                test_results=[]
            )
            
        except docker.errors.ImageNotFound:
            return ExecutionResult(
                status="error",
                output="",
                error=f"Docker image not found: {config['image']}",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        except Exception as e:
            logger.error(f"Execution error: {e}", exc_info=True)
            return ExecutionResult(
                status="error",
                output="",
                error=f"Execution failed: {str(e)}",
                execution_time=time.time() - start_time,
                exit_code=-1,
                test_results=[]
            )
    
    def _prepare_python_code(self, user_code: str, stdin: str) -> str:
        """Prepare Python code for execution"""
        stdin_escaped = stdin.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
        
        # Check if user has their own main block
        if self._has_user_main(user_code):
            return f'''import sys
import io

sys.stdin = io.StringIO('{stdin_escaped}')

{user_code}
'''
        
        # Otherwise, just run the code
        return f'''import sys
import io

sys.stdin = io.StringIO('{stdin_escaped}')

{user_code}
'''
    
    def _prepare_java_code(self, user_code: str, stdin: str) -> str:
        """Prepare Java code for execution"""
        # Simple wrapper for now
        return user_code
    
    def _has_user_main(self, code: str) -> bool:
        """Check if code has main block"""
        return bool(re.search(r'if\s+__name__\s*==\s*["\']__main__["\']\s*:', code))
    
    def _create_tar(self, filename: str, content: str) -> bytes:
        """Create tar archive with file"""
        import tarfile
        import io
        
        tar_stream = io.BytesIO()
        tar = tarfile.TarFile(fileobj=tar_stream, mode='w')
        
        # Create file info
        file_data = content.encode('utf-8')
        tarinfo = tarfile.TarInfo(name=filename)
        tarinfo.size = len(file_data)
        tarinfo.mode = 0o644
        
        # Add to tar
        tar.addfile(tarinfo, io.BytesIO(file_data))
        tar.close()
        
        return tar_stream.getvalue()
    
    def cleanup(self):
        """Cleanup resources"""
        if self.client:
            try:
                # Remove any dangling containers
                containers = self.client.containers.list(
                    all=True,
                    filters={"status": "exited"}
                )
                for container in containers:
                    container.remove()
                logger.info("Cleanup completed")
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
