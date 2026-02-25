"""
Seed script for initial database data.
Creates default instructor and student accounts.
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import bcrypt
from .database import SessionLocal, init_db
from .models import User


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_default_accounts(db: Session):
    """Create default instructor and student accounts."""
    
    # Check if accounts already exist
    existing_instructor = db.query(User).filter(User.username == 'admin').first()
    existing_student = db.query(User).filter(User.username == 'student').first()
    
    if existing_instructor and existing_student:
        print("ℹ️  Default accounts already exist. Skipping seed.")
        return
    
    accounts_created = []
    
    # Create instructor account (admin)
    if not existing_instructor:
        instructor = User(
            id=str(uuid.uuid4()),
            username='admin',
            email='admin@rbai.edu',
            password_hash=hash_password('admin123'),
            account_type='instructor',
            first_name='Admin',
            last_name='Instructor',
            created_at=datetime.utcnow(),
            is_active=True
        )
        db.add(instructor)
        accounts_created.append('admin (instructor)')
    
    # Create student account
    if not existing_student:
        student = User(
            id=str(uuid.uuid4()),
            username='student',
            email='student@rbai.edu',
            password_hash=hash_password('student123'),
            account_type='student',
            first_name='John',
            last_name='Doe',
            created_at=datetime.utcnow(),
            is_active=True
        )
        db.add(student)
        accounts_created.append('student')
    
    db.commit()
    
    if accounts_created:
        print(f"✅ Created default accounts: {', '.join(accounts_created)}")
        print("   - Username: admin, Password: admin123 (instructor)")
        print("   - Username: student, Password: student123 (student)")
    
    return accounts_created


def seed_database():
    """Main seed function."""
    print("🌱 Seeding database...")
    
    # Initialize database (create tables if they don't exist)
    init_db()
    
    # Create session
    db = SessionLocal()
    
    try:
        # Create default accounts
        create_default_accounts(db)
        
        print("✅ Database seeding complete!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
