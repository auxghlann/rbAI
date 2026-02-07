"""
Authentication endpoints for login and user management.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Request/Response Models
class LoginRequest(BaseModel):
    username: str = Field(..., description="Username for login")
    password: str = Field(..., description="Password for login")


class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    email: str
    studentId: str
    program: str
    year: str
    accountType: str

    class Config:
        from_attributes = True


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


@router.post("/login", response_model=UserResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with username and password.
    
    Returns user data (without password) if credentials are valid.
    
    Rate limit: 5 attempts per minute per IP.
    """
    try:
        # Find user by username
        user = db.query(User).filter(User.username == request.username).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check if account is active
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login time
        from datetime import datetime
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Return user data (without password)
        # Format to match frontend expectations
        return UserResponse(
            id=user.id,
            username=user.username,
            name=f"{user.first_name} {user.last_name}",
            email=user.email,
            studentId=user.id[:8],  # Use first 8 chars of UUID as student ID
            program=f"{user.account_type.title()} Program",  # Placeholder
            year="2024",  # Placeholder
            accountType=user.account_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error but don't expose details to client
        import logging
        logging.error(f"Login error for user {request.username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed. Please try again later.")


@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str, db: Session = Depends(get_db)):
    """
    Get current user information by user ID.
    
    This can be used to verify a user's session.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        return UserResponse(
            id=user.id,
            username=user.username,
            name=f"{user.first_name} {user.last_name}",
            email=user.email,
            studentId=user.id[:8],
            program=f"{user.account_type.title()} Program",
            year="2024",
            accountType=user.account_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Get user error for user_id {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve user information.")
