from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Place(Base):
    __tablename__ = "places"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    day_id = Column(Integer, ForeignKey("trip_days.id"), nullable=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    notes = Column(Text, default="")
    category = Column(String, default="sehenswürdigkeit")
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="places")
    day = relationship("TripDay", back_populates="places")
