from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    title = Column(String, nullable=False)
    booking_type = Column(String, default="sonstiges")  # unterkunft, flug, mietwagen, sonstiges
    date = Column(Date, nullable=True)
    price = Column(Float, nullable=True)
    currency = Column(String, default="EUR")
    notes = Column(Text, default="")
    link = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="bookings")
