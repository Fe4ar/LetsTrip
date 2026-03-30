from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
import os, uuid, aiofiles

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.file_asset import FileAsset
from app.api.trips import check_trip_access

router = APIRouter()

@router.get("/{trip_id}/files")
def get_files(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    files = db.query(FileAsset).filter(FileAsset.trip_id == trip_id).order_by(FileAsset.created_at.desc()).all()
    return [serialize_file(f) for f in files]

@router.post("/{trip_id}/files")
async def upload_file(trip_id: int, file: UploadFile = FastAPIFile(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    asset = FileAsset(
        trip_id=trip_id, original_name=file.filename or stored_name,
        stored_name=stored_name, mime_type=file.content_type or "application/octet-stream",
        size=len(content), uploaded_by=current_user.id
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return serialize_file(asset)

@router.delete("/{trip_id}/files/{file_id}")
def delete_file(trip_id: int, file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    asset = db.query(FileAsset).filter(FileAsset.id == file_id, FileAsset.trip_id == trip_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    file_path = os.path.join(settings.UPLOAD_DIR, asset.stored_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.delete(asset)
    db.commit()
    return {"ok": True}

def serialize_file(f: FileAsset):
    return {"id": f.id, "trip_id": f.trip_id, "original_name": f.original_name, "stored_name": f.stored_name, "mime_type": f.mime_type, "size": f.size, "notes": f.notes, "uploaded_by": f.uploaded_by, "created_at": str(f.created_at), "url": f"/uploads/{f.stored_name}"}
