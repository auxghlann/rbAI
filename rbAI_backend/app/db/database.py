"""Database connection and session management."""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Database configuration
DATABASE_PATH = os.getenv('DATABASE_PATH', './db/rbai.db')
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine with SQLite optimizations
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,  # Allow multi-threaded access
        "timeout": 30  # Wait up to 30 seconds for locks
    },
    poolclass=StaticPool,  # Use single connection pool for SQLite
    echo=False  # Set to True for SQL query logging
)

# Enable foreign key constraints for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable foreign key constraints on connection."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging for better concurrency
    cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency function for FastAPI routes.
    
    Usage:
        @app.get("/sessions")
        def get_sessions(db: Session = Depends(get_db)):
            return db.query(Session).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    
    Call this on application startup to create all tables.
    """
    from .models import Base
    
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized at {DATABASE_PATH}")
    
    # Optional: Load schema.sql for views
    try:
        with open('./app/db/schema.sql', 'r') as f:
            schema_sql = f.read()
            # Extract only CREATE VIEW statements
            view_statements = [stmt.strip() for stmt in schema_sql.split(';') if 'CREATE VIEW' in stmt]
            
            with engine.begin() as conn:
                for stmt in view_statements:
                    if stmt:
                        conn.execute(stmt)
            print(f"✅ Database views created")
    except FileNotFoundError:
        print("⚠️  schema.sql not found, skipping view creation")
    except Exception as e:
        print(f"⚠️  Could not create views: {e}")


def reset_db():
    """
    Drop all tables and recreate them.
    
    WARNING: This will delete all data!
    Use only for development/testing.
    """
    from .models import Base
    
    Base.metadata.drop_all(bind=engine)
    print("⚠️  All tables dropped")
    
    init_db()
    print("✅ Database reset complete")
