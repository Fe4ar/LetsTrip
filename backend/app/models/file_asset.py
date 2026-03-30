from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class FileAsset(Base):
    __tablename__ = "file_assets"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    original_name = Column(String, nullable=False)
    stored_name = Column(String, nullable=False)
    mime_type = Column(String, default="application/octet-stream")
    size = Column(BigInteger, default=0)
    notes = Column(Text, default="")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="files")
    uploader = relationship("User")
