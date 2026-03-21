from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
from database import get_db
from dependencies import verify_token
from hashing import hash_password, verify_password
import os

router = APIRouter(prefix="/api/auth", tags=["auth"], redirect_slashes=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=int(os.getenv("JWT_EXPIRE_HOURS", 8)))
    return jwt.encode(
        {"username": username, "role": "admin", "exp": expire},
        os.getenv("JWT_SECRET"),
        algorithm="HS256",
    )


@router.post("/login")
async def login(body: LoginRequest):
    db = get_db()
    admin = await db["admins"].find_one({"username": body.username})

    if not admin or not verify_password(body.password, admin["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_token(body.username)
    return {"token": token, "username": body.username, "role": "admin"}


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user=Depends(verify_token)):
    if not body.currentPassword or not body.newPassword:
        raise HTTPException(status_code=400, detail="All fields are required")

    if len(body.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    db = get_db()
    admin = await db["admins"].find_one({"username": user["username"]})

    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not verify_password(body.currentPassword, admin["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    await db["admins"].update_one(
        {"username": user["username"]},
        {"$set": {"password": hash_password(body.newPassword)}}
    )

    return {"message": "Password changed successfully"}
