import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import Base, engine, SessionLocal
from app.models import user, trip, place, expense, booking, file_asset, activity_log
from app.core.security import get_password_hash
from app.models.user import User
from app.models.trip import Trip, TripMember, TripDay
from datetime import date, timedelta

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    seed_data()

def seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded.")
            return

        print("Seeding demo users...")
        admin = User(
            email="admin@letstrip.local",
            name="Admin Benutzer",
            hashed_password=get_password_hash("Admin123!"),
            role="admin",
            is_active=True
        )
        lead = User(
            email="lead@letstrip.local",
            name="Max Mustermann",
            hashed_password=get_password_hash("Lead123!"),
            role="teamleiter",
            is_active=True
        )
        traveler = User(
            email="traveler@letstrip.local",
            name="Anna Reisende",
            hashed_password=get_password_hash("Travel123!"),
            role="reisender",
            is_active=True
        )
        db.add_all([admin, lead, traveler])
        db.flush()

        print("Seeding demo trip...")
        start = date(2025, 7, 1)
        end = date(2025, 7, 7)
        demo_trip = Trip(
            name="Europareise Sommer 2025",
            description="Eine wunderbare Reise durch Europa",
            start_date=start,
            end_date=end,
            created_by=lead.id
        )
        db.add(demo_trip)
        db.flush()

        days_count = (end - start).days + 1
        for i in range(days_count):
            day = TripDay(
                trip_id=demo_trip.id,
                day_number=i+1,
                date=start + timedelta(days=i),
                label=f"Tag {i+1}",
                notes=""
            )
            db.add(day)

        for u in [admin, lead, traveler]:
            role_in_trip = "teamleiter" if u.role in ("admin","teamleiter") else "reisender"
            member = TripMember(trip_id=demo_trip.id, user_id=u.id, role=role_in_trip)
            db.add(member)

        db.commit()
        print("Seeding complete!")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
