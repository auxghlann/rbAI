"""Database connection and session management."""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# Database configuration - support both SQLite (dev) and PostgreSQL (production)
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    # Fallback to SQLite for local development
    DATABASE_PATH = os.getenv('DATABASE_PATH', './db/rbai.db')
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    IS_SQLITE = True
else:
    # Railway and other cloud providers use DATABASE_URL
    # Handle Railway's postgres:// -> postgresql:// requirement
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    IS_SQLITE = False

# Create engine with appropriate settings for SQLite or PostgreSQL
if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,  # Allow multi-threaded access
            "timeout": 30  # Wait up to 30 seconds for locks
        },
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=3600,
        echo=False
    )
    
    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        """Enable foreign key constraints on connection."""
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging for better concurrency
        cursor.close()
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=3600,
        pool_pre_ping=True,  # Verify connections before using
        echo=False
    )

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
    Safe to call multiple times - only creates tables that don't exist.
    """
    from .models import Base
    
    # Create data directory if using SQLite
    if IS_SQLITE:
        DATABASE_PATH = os.getenv('DATABASE_PATH', './db/rbai.db')
        os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    # Create all tables (checkfirst=True is default, so this is safe to run multiple times)
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        db_type = "SQLite" if IS_SQLITE else "PostgreSQL"
        print(f"✅ Database initialized ({db_type})")
    except Exception as e:
        # Log error but don't crash - tables might already exist
        print(f"⚠️  Database initialization note: {e}")
        print(f"   (This is normal if database already exists)")
    
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
