from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from database import connect_db, close_db, get_db
from hashing import hash_password
from routers import auth, tickets


async def seed_admin():
    db = get_db()
    admin = await db["admins"].find_one({"username": os.getenv("ADMIN_USERNAME")})
    if not admin:
        await db["admins"].insert_one({
            "username": os.getenv("ADMIN_USERNAME"),
            "password": hash_password(os.getenv("ADMIN_PASSWORD")),
        })
        print("Default admin seeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await seed_admin()
    yield
    await close_db()


app = FastAPI(title="Chat Support API", version="1.0.0", lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)

# Serve uploaded images
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "Chat Support API is running (FastAPI)"}
