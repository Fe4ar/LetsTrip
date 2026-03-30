from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, users, trips, places, expenses, bookings, files, activity
from app.core.config import settings

app = FastAPI(title="LetsTrip API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(trips.router, prefix="/trips", tags=["trips"])
app.include_router(places.router, prefix="/trips", tags=["places"])
app.include_router(expenses.router, prefix="/trips", tags=["expenses"])
app.include_router(bookings.router, prefix="/trips", tags=["bookings"])
app.include_router(files.router, prefix="/trips", tags=["files"])
app.include_router(activity.router, prefix="/trips", tags=["activity"])

upload_dir = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(upload_dir, exist_ok=True)

@app.get("/health")
def health():
    return {"status": "ok"}
