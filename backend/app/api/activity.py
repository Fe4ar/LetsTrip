from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.api.trips import check_trip_access

router = APIRouter()

@router.get("/{trip_id}/activity")
def get_activity(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    logs = db.query(ActivityLog).options(joinedload(ActivityLog.user)).filter(
        ActivityLog.trip_id == trip_id
    ).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return [{"id": l.id, "action": l.action, "description": l.description, "user_name": l.user.name if l.user else "System", "created_at": str(l.created_at)} for l in logs]
