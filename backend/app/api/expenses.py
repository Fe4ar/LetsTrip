from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.expense import Expense, ExpenseParticipant
from app.api.trips import check_trip_access

router = APIRouter()

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    currency: str = "EUR"
    date: Optional[date] = None
    category: str = "sonstiges"
    notes: str = ""
    paid_by: Optional[int] = None
    day_id: Optional[int] = None
    participant_ids: List[int]

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[date] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    paid_by: Optional[int] = None
    day_id: Optional[int] = None
    participant_ids: Optional[List[int]] = None

@router.get("/{trip_id}/expenses")
def get_expenses(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    expenses = db.query(Expense).options(
        joinedload(Expense.participants).joinedload(ExpenseParticipant.user),
        joinedload(Expense.payer)
    ).filter(Expense.trip_id == trip_id).order_by(Expense.created_at.desc()).all()
    return [serialize_expense(e) for e in expenses]

@router.post("/{trip_id}/expenses")
def create_expense(trip_id: int, data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    if not data.participant_ids:
        raise HTTPException(status_code=400, detail="Mindestens eine betroffene Person erforderlich")
    expense = Expense(
        trip_id=trip_id, title=data.title, amount=data.amount, currency=data.currency,
        date=data.date, category=data.category, notes=data.notes,
        paid_by=data.paid_by, day_id=data.day_id, created_by=current_user.id
    )
    db.add(expense)
    db.flush()
    share = data.amount / len(data.participant_ids)
    for uid in data.participant_ids:
        p = ExpenseParticipant(expense_id=expense.id, user_id=uid, share=share)
        db.add(p)
    db.commit()
    db.refresh(expense)
    expense = db.query(Expense).options(
        joinedload(Expense.participants).joinedload(ExpenseParticipant.user),
        joinedload(Expense.payer)
    ).filter(Expense.id == expense.id).first()
    return serialize_expense(expense)

@router.put("/{trip_id}/expenses/{expense_id}")
def update_expense(trip_id: int, expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.trip_id == trip_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Ausgabe nicht gefunden")
    if data.title is not None: expense.title = data.title
    if data.amount is not None: expense.amount = data.amount
    if data.currency is not None: expense.currency = data.currency
    if data.date is not None: expense.date = data.date
    if data.category is not None: expense.category = data.category
    if data.notes is not None: expense.notes = data.notes
    if data.paid_by is not None: expense.paid_by = data.paid_by
    if data.day_id is not None: expense.day_id = data.day_id
    if data.participant_ids is not None:
        if not data.participant_ids:
            raise HTTPException(status_code=400, detail="Mindestens eine betroffene Person erforderlich")
        db.query(ExpenseParticipant).filter(ExpenseParticipant.expense_id == expense_id).delete()
        amount = data.amount if data.amount is not None else expense.amount
        share = amount / len(data.participant_ids)
        for uid in data.participant_ids:
            p = ExpenseParticipant(expense_id=expense_id, user_id=uid, share=share)
            db.add(p)
    db.commit()
    expense = db.query(Expense).options(
        joinedload(Expense.participants).joinedload(ExpenseParticipant.user),
        joinedload(Expense.payer)
    ).filter(Expense.id == expense_id).first()
    return serialize_expense(expense)

@router.delete("/{trip_id}/expenses/{expense_id}")
def delete_expense(trip_id: int, expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.trip_id == trip_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Ausgabe nicht gefunden")
    db.delete(expense)
    db.commit()
    return {"ok": True}

@router.get("/{trip_id}/expenses/summary")
def get_summary(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    expenses = db.query(Expense).options(
        joinedload(Expense.participants).joinedload(ExpenseParticipant.user)
    ).filter(Expense.trip_id == trip_id).all()
    
    total = sum(e.amount for e in expenses)
    by_category: dict = {}
    by_person: dict = {}
    
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + e.amount
        for p in e.participants:
            key = str(p.user_id)
            if key not in by_person:
                by_person[key] = {"user_id": p.user_id, "name": p.user.name, "total": 0, "entries": []}
            by_person[key]["total"] = round(by_person[key]["total"] + p.share, 2)
            by_person[key]["entries"].append({"expense_id": e.id, "title": e.title, "share": p.share, "currency": e.currency})
    
    return {
        "total": round(total, 2),
        "by_category": [{"category": k, "amount": round(v, 2)} for k, v in by_category.items()],
        "by_person": list(by_person.values())
    }

def serialize_expense(e: Expense):
    return {
        "id": e.id, "trip_id": e.trip_id, "day_id": e.day_id, "title": e.title,
        "amount": e.amount, "currency": e.currency,
        "date": str(e.date) if e.date else None,
        "category": e.category, "notes": e.notes,
        "paid_by": e.paid_by,
        "payer_name": e.payer.name if e.payer else None,
        "participants": [{"user_id": p.user_id, "name": p.user.name, "share": p.share} for p in e.participants],
        "created_at": str(e.created_at)
    }
