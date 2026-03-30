from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_trips")
    members = relationship("TripMember", back_populates="trip", cascade="all, delete-orphan")
    days = relationship("TripDay", back_populates="trip", order_by="TripDay.day_number", cascade="all, delete-orphan")
    places = relationship("Place", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trip", cascade="all, delete-orphan")
    files = relationship("FileAsset", back_populates="trip", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="trip", cascade="all, delete-orphan")

class TripMember(Base):
    __tablename__ = "trip_members"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="reisender")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="trip_memberships")

class TripDay(Base):
    __tablename__ = "trip_days"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    label = Column(String, nullable=False)
    notes = Column(Text, default="")

    trip = relationship("Trip", back_populates="days")
    places = relationship("Place", back_populates="day", order_by="Place.order_index")
