from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    day_id = Column(Integer, ForeignKey("trip_days.id"), nullable=True)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    date = Column(Date, nullable=True)
    category = Column(String, default="sonstiges")
    notes = Column(Text, default="")
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="expenses")
    participants = relationship("ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan")
    payer = relationship("User", foreign_keys=[paid_by])
    creator = relationship("User", foreign_keys=[created_by])

class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share = Column(Float, nullable=False)

    expense = relationship("Expense", back_populates="participants")
    user = relationship("User")
