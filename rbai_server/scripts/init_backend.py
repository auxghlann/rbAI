#!/usr/bin/env python3
"""
Backend initialization and testing script.
Tests database connectivity and basic CRUD operations.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import init_db, SessionLocal
from app.db.seed import seed_database
from app.db.models import User, Activity
import json


def test_database_connection():
    """Test database connection and basic queries."""
    print("\n🧪 Testing database connection...")
    
    db = SessionLocal()
    try:
        # Test user query
        users = db.query(User).all()
        print(f"✅ Found {len(users)} users in database")
        for user in users:
            print(f"   - {user.username} ({user.account_type})")
        
        # Test activity query
        activities = db.query(Activity).all()
        print(f"✅ Found {len(activities)} activities in database")
        for activity in activities:
            print(f"   - {activity.title}")
        
        return True
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False
    finally:
        db.close()


def create_sample_activity():
    """Create a sample activity for testing."""
    print("\n🧪 Creating sample activity...")
    
    db = SessionLocal()
    try:
        # Check if sample activity already exists
        existing = db.query(Activity).filter(Activity.title == "Test Activity").first()
        if existing:
            print("ℹ️  Sample activity already exists")
            return True
        
        # Get admin user
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("❌ Admin user not found. Run seed first.")
            return False
        
        # Create sample activity
        import uuid
        from datetime import datetime
        
        sample_activity = Activity(
            id=str(uuid.uuid4()),
            title="Test Activity",
            description="A test activity to verify the system works",
            created_at=datetime.utcnow().strftime('%Y-%m-%d'),
            problem_statement="# Test Problem\n\nWrite a function that returns 'Hello, World!'",
            language='python',
            starter_code='def hello():\n    # Your code here\n    pass',
            test_cases=json.dumps([
                {
                    "name": "Test Case 1",
                    "input": "",
                    "expectedOutput": "Hello, World!",
                    "isHidden": False
                }
            ]),
            hints=json.dumps(["Use the return statement", "Remember the string format"]),
            created_by=admin.id,
            is_active=True
        )
        
        db.add(sample_activity)
        db.commit()
        
        print(f"✅ Sample activity created: {sample_activity.title}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create sample activity: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    """Main initialization function."""
    print("=" * 60)
    print("rbAI Backend Initialization")
    print("=" * 60)
    
    # Step 1: Initialize database
    print("\n📦 Step 1: Initializing database...")
    try:
        init_db()
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return False
    
    # Step 2: Seed database
    print("\n🌱 Step 2: Seeding database with default accounts...")
    try:
        seed_database()
    except Exception as e:
        print(f"❌ Failed to seed database: {e}")
        return False
    
    # Step 3: Test database connection
    if not test_database_connection():
        return False
    
    # Step 4: Create sample activity
    if not create_sample_activity():
        return False
    
    # Success!
    print("\n" + "=" * 60)
    print("✅ Backend initialization complete!")
    print("=" * 60)
    print("\n📋 Default Accounts Created:")
    print("   Admin Account:")
    print("   - Username: admin")
    print("   - Password: admin123")
    print("   - Type: instructor")
    print("\n   Student Account:")
    print("   - Username: student")
    print("   - Password: student123")
    print("   - Type: student")
    print("\n🚀 Next Steps:")
    print("   1. Start the backend server: uv run fastapi dev app/main.py")
    print("   2. Start the frontend: cd ../rbAI && npm run dev")
    print("   3. Login with the accounts above")
    print("   4. Test creating activities with AI generation")
    print("\n" + "=" * 60)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
