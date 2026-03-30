from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import requests

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.place import Place
from app.models.trip import TripDay
from app.api.trips import check_trip_access

router = APIRouter()

class PlaceCreate(BaseModel):
    name: str
    address: str = ""
    lat: Optional[float] = None
    lon: Optional[float] = None
    notes: str = ""
    category: str = "sehenswürdigkeit"
    day_id: Optional[int] = None
    order_index: int = 0

class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    category: Optional[str] = None
    day_id: Optional[int] = None
    order_index: Optional[int] = None

class PlaceReorder(BaseModel):
    place_ids: List[int]

@router.get("/{trip_id}/places")
def get_places(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    places = db.query(Place).filter(Place.trip_id == trip_id).order_by(Place.day_id, Place.order_index).all()
    return [serialize_place(p) for p in places]

@router.post("/{trip_id}/places")
def create_place(trip_id: int, data: PlaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    if data.day_id:
        day = db.query(TripDay).filter(TripDay.id == data.day_id, TripDay.trip_id == trip_id).first()
        if not day:
            raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    place = Place(
        trip_id=trip_id, day_id=data.day_id, name=data.name, address=data.address,
        lat=data.lat, lon=data.lon, notes=data.notes, category=data.category, order_index=data.order_index
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return serialize_place(place)

@router.put("/{trip_id}/places/{place_id}")
def update_place(trip_id: int, place_id: int, data: PlaceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    place = db.query(Place).filter(Place.id == place_id, Place.trip_id == trip_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Ort nicht gefunden")
    if data.name is not None: place.name = data.name
    if data.notes is not None: place.notes = data.notes
    if data.category is not None: place.category = data.category
    if data.day_id is not None: place.day_id = data.day_id
    if data.order_index is not None: place.order_index = data.order_index
    db.commit()
    db.refresh(place)
    return serialize_place(place)

@router.delete("/{trip_id}/places/{place_id}")
def delete_place(trip_id: int, place_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    place = db.query(Place).filter(Place.id == place_id, Place.trip_id == trip_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Ort nicht gefunden")
    db.delete(place)
    db.commit()
    return {"ok": True}

@router.post("/{trip_id}/places/reorder")
def reorder_places(trip_id: int, data: PlaceReorder, day_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    for idx, place_id in enumerate(data.place_ids):
        place = db.query(Place).filter(Place.id == place_id, Place.trip_id == trip_id).first()
        if place:
            place.order_index = idx
    db.commit()
    return {"ok": True}

@router.get("/{trip_id}/route")
def get_route(trip_id: int, day_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_trip_access(trip_id, current_user, db)
    places = db.query(Place).filter(Place.trip_id == trip_id, Place.day_id == day_id).order_by(Place.order_index).all()
    geo_places = [p for p in places if p.lat and p.lon]
    if len(geo_places) < 2:
        return {"segments": [], "total_distance": 0, "total_duration": 0}
    
    coords = ";".join(f"{p.lon},{p.lat}" for p in geo_places)
    try:
        resp = requests.get(
            f"http://router.project-osrm.org/route/v1/driving/{coords}",
            params={"overview": "full", "geometries": "geojson", "steps": "true"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("routes"):
                route = data["routes"][0]
                legs = route.get("legs", [])
                segments = []
                for i, leg in enumerate(legs):
                    segments.append({
                        "from_place": serialize_place(geo_places[i]),
                        "to_place": serialize_place(geo_places[i+1]),
                        "distance_m": leg.get("distance", 0),
                        "duration_s": leg.get("duration", 0),
                    })
                return {
                    "segments": segments,
                    "total_distance": route.get("distance", 0),
                    "total_duration": route.get("duration", 0),
                    "geometry": route.get("geometry")
                }
    except Exception:
        pass
    return {"segments": [], "total_distance": 0, "total_duration": 0, "geometry": None}

@router.get("/geocode/search")
def geocode_search(q: str, limit: int = 5):
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "limit": limit, "addressdetails": 1},
            headers={"User-Agent": "LetsTrip/1.0"},
            timeout=10
        )
        if resp.status_code == 200:
            results = resp.json()
            return [{"name": r.get("display_name", ""), "lat": float(r["lat"]), "lon": float(r["lon"]), "type": r.get("type", "")} for r in results]
    except Exception:
        pass
    return []

def serialize_place(p: Place):
    return {"id": p.id, "trip_id": p.trip_id, "day_id": p.day_id, "name": p.name, "address": p.address, "lat": p.lat, "lon": p.lon, "notes": p.notes, "category": p.category, "order_index": p.order_index}
