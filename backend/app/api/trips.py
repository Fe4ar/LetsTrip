from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripMember, TripDay
from app.models.activity_log import ActivityLog

router = APIRouter()

class TripCreate(BaseModel):
    name: str
    description: str = ""
    start_date: date
    end_date: date

class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class TripDayUpdate(BaseModel):
    notes: Optional[str] = None
    label: Optional[str] = None

class MemberAdd(BaseModel):
    user_id: int
    role: str = "reisender"

def check_trip_access(trip_id: int, user: User, db: Session, require_lead: bool = False):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Reise nicht gefunden")
    if user.role == "admin":
        return trip
    member = db.query(TripMember).filter(TripMember.trip_id == trip_id, TripMember.user_id == user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diese Reise")
    if require_lead and member.role not in ("teamleiter", "admin") and user.role not in ("admin", "teamleiter"):
        raise HTTPException(status_code=403, detail="Nur Teamleiter können das")
    return trip

def log_activity(db: Session, trip_id: int, user_id: int, action: str, description: str = ""):
    log = ActivityLog(trip_id=trip_id, user_id=user_id, action=action, description=description)
    db.add(log)

@router.get("")
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        trips = db.query(Trip).options(joinedload(Trip.members).joinedload(TripMember.user)).all()
    else:
        memberships = db.query(TripMember).filter(TripMember.user_id == current_user.id).all()
        trip_ids = [m.trip_id for m in memberships]
        trips = db.query(Trip).filter(Trip.id.in_(trip_ids)).options(joinedload(Trip.members).joinedload(TripMember.user)).all()
    result = []
    for t in trips:
        result.append({
            "id": t.id, "name": t.name, "description": t.description,
            "start_date": str(t.start_date), "end_date": str(t.end_date),
            "created_by": t.created_by,
            "members": [{"id": m.id, "user_id": m.user_id, "name": m.user.name, "email": m.user.email, "role": m.role} for m in t.members]
        })
    return result

@router.post("")
def create_trip(data: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "teamleiter"):
        raise HTTPException(status_code=403, detail="Nur Teamleiter und Admins dürfen Reisen erstellen")
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="Enddatum muss nach Startdatum liegen")
    trip = Trip(name=data.name, description=data.description, start_date=data.start_date, end_date=data.end_date, created_by=current_user.id)
    db.add(trip)
    db.flush()
    days_count = (data.end_date - data.start_date).days + 1
    for i in range(days_count):
        day = TripDay(trip_id=trip.id, day_number=i+1, date=data.start_date + timedelta(days=i), label=f"Tag {i+1}", notes="")
        db.add(day)
    member = TripMember(trip_id=trip.id, user_id=current_user.id, role="teamleiter")
    db.add(member)
    log_activity(db, trip.id, current_user.id, "trip_created", f"Reise '{data.name}' erstellt")
    db.commit()
    db.refresh(trip)
    return {"id": trip.id, "name": trip.name, "description": trip.description, "start_date": str(trip.start_date), "end_date": str(trip.end_date)}

@router.get("/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = check_trip_access(trip_id, current_user, db)
    days = db.query(TripDay).filter(TripDay.trip_id == trip_id).order_by(TripDay.day_number).all()
    members = db.query(TripMember).options(joinedload(TripMember.user)).filter(TripMember.trip_id == trip_id).all()
    return {
        "id": trip.id, "name": trip.name, "description": trip.description,
        "start_date": str(trip.start_date), "end_date": str(trip.end_date),
        "created_by": trip.created_by,
        "days": [{"id": d.id, "day_number": d.day_number, "date": str(d.date), "label": d.label, "notes": d.notes} for d in days],
        "members": [{"id": m.id, "user_id": m.user_id, "name": m.user.name, "email": m.user.email, "role": m.role} for m in members]
    }

@router.put("/{trip_id}")
def update_trip(trip_id: int, data: TripUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = check_trip_access(trip_id, current_user, db)
    if data.name: trip.name = data.name
    if data.description is not None: trip.description = data.description
    db.commit()
    return {"ok": True}

@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "teamleiter"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    trip = check_trip_access(trip_id, current_user, db)
    db.delete(trip)
    db.commit()
    return {"ok": True}

@router.get("/{trip_id}/days")
def get_days(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    days = db.query(TripDay).filter(TripDay.trip_id == trip_id).order_by(TripDay.day_number).all()
    return [{"id": d.id, "day_number": d.day_number, "date": str(d.date), "label": d.label, "notes": d.notes} for d in days]

@router.put("/{trip_id}/days/{day_id}")
def update_day(trip_id: int, day_id: int, data: TripDayUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    day = db.query(TripDay).filter(TripDay.id == day_id, TripDay.trip_id == trip_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    if data.notes is not None: day.notes = data.notes
    if data.label is not None: day.label = data.label
    db.commit()
    return {"ok": True}

@router.get("/{trip_id}/members")
def get_members(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    members = db.query(TripMember).options(joinedload(TripMember.user)).filter(TripMember.trip_id == trip_id).all()
    return [{"id": m.id, "user_id": m.user_id, "name": m.user.name, "email": m.user.email, "role": m.role} for m in members]

@router.post("/{trip_id}/members")
def add_member(trip_id: int, data: MemberAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db, require_lead=True)
    if current_user.role not in ("admin", "teamleiter"):
        raise HTTPException(status_code=403, detail="Nur Teamleiter und Admins dürfen Mitglieder hinzufügen")
    existing = db.query(TripMember).filter(TripMember.trip_id == trip_id, TripMember.user_id == data.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Benutzer ist bereits Mitglied")
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    member = TripMember(trip_id=trip_id, user_id=data.user_id, role=data.role)
    db.add(member)
    log_activity(db, trip_id, current_user.id, "member_added", f"{user.name} zur Reise hinzugefügt")
    db.commit()
    return {"ok": True}

@router.delete("/{trip_id}/members/{user_id}")
def remove_member(trip_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db, require_lead=True)
    if current_user.role not in ("admin", "teamleiter"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    member = db.query(TripMember).filter(TripMember.trip_id == trip_id, TripMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    db.delete(member)
    db.commit()
    return {"ok": True}
