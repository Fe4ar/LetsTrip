from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.booking import Booking
from app.api.trips import check_trip_access

router = APIRouter()

class BookingCreate(BaseModel):
    title: str
    booking_type: str = "sonstiges"
    date: Optional[date] = None
    price: Optional[float] = None
    currency: str = "EUR"
    notes: str = ""
    link: str = ""

class BookingUpdate(BaseModel):
    title: Optional[str] = None
    booking_type: Optional[str] = None
    date: Optional[date] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    link: Optional[str] = None

@router.get("/{trip_id}/bookings")
def get_bookings(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    bookings = db.query(Booking).filter(Booking.trip_id == trip_id).order_by(Booking.date).all()
    return [serialize_booking(b) for b in bookings]

@router.post("/{trip_id}/bookings")
def create_booking(trip_id: int, data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    booking = Booking(trip_id=trip_id, **data.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)

@router.put("/{trip_id}/bookings/{booking_id}")
def update_booking(trip_id: int, booking_id: int, data: BookingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.trip_id == trip_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(booking, field, value)
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)

@router.delete("/{trip_id}/bookings/{booking_id}")
def delete_booking(trip_id: int, booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.trip_id == trip_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    db.delete(booking)
    db.commit()
    return {"ok": True}

def serialize_booking(b: Booking):
    return {"id": b.id, "trip_id": b.trip_id, "title": b.title, "booking_type": b.booking_type, "date": str(b.date) if b.date else None, "price": b.price, "currency": b.currency, "notes": b.notes, "link": b.link}
