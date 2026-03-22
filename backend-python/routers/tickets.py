from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, Header
from typing import Optional
from datetime import datetime
from database import get_db
from dependencies import verify_token
from services.email_service import send_ticket_created_email, send_ticket_status_email
from pydantic import BaseModel
from jose import jwt, JWTError
import asyncio
import aiofiles
import os
import uuid
import time

PARENT_APP_SECRET = os.getenv("PARENT_APP_SECRET", "")


def decode_user_token(token: str) -> Optional[dict]:
    """Decode and validate the parent app JWT. Returns claims or None if invalid."""
    if not token or not PARENT_APP_SECRET:
        return None
    try:
        claims = jwt.decode(token, PARENT_APP_SECRET, algorithms=["HS256"], options={"verify_exp": False})
        # Validate custom not_after (in milliseconds)
        not_after = claims.get("not_after")
        if not_after and int(time.time() * 1000) > not_after:
            return None
        return claims
    except JWTError:
        return None

router = APIRouter(prefix="/api/tickets", tags=["tickets"], redirect_slashes=False)

VALID_STATUSES = ["Created", "Assigned", "Fixed", "Closed"]
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


async def generate_ticket_id(conn) -> str:
    row = await conn.fetchrow("SELECT ticket_id FROM tickets ORDER BY created_at DESC LIMIT 1")
    next_num = 1
    if row and row["ticket_id"]:
        parts = row["ticket_id"].split("-")
        try:
            next_num = int(parts[-1]) + 1
        except ValueError:
            pass
    return f"TK-SAAFE-{str(next_num).zfill(3)}"


def serialize(row) -> dict:
    return {
        "_id": str(row["id"]),
        "ticketId": row["ticket_id"],
        "issueDescription": row["issue_description"],
        "contact": row["contact"],
        "contactType": row["contact_type"],
        "secondContact": row["second_contact"],
        "secondContactType": row["second_contact_type"],
        "userName": row["user_name"],
        "status": row["status"],
        "notes": row["notes"],
        "attachmentUrl": row["attachment_url"],
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
        "closedAt": row["closed_at"].isoformat() if row["closed_at"] else None,
    }


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@router.post("", status_code=201)
async def create_ticket(
    issueDescription: str = Form(...),
    contact: Optional[str] = Form(None),
    contactType: Optional[str] = Form(None),
    secondContact: Optional[str] = Form(None),
    secondContactType: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    x_user_token: Optional[str] = Header(None),
):
    # Try to identify user from parent app JWT
    user_claims = decode_user_token(x_user_token) if x_user_token else None
    user_name = None

    if user_claims:
        first = user_claims.get("first_name", "")
        last = user_claims.get("last_name", "")
        user_name = f"{first} {last}".strip() or None
        # Use phone from token if contact not provided
        if not contact and user_claims.get("phone_number"):
            contact = user_claims["phone_number"]
            contactType = "phone"

    if not issueDescription or not contact or not contactType:
        raise HTTPException(status_code=400, detail="All fields are required")

    attachment_url = None

    # Handle image upload
    if image and image.filename:
        if image.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Only image files are allowed (JPG, PNG, GIF, WEBP)")

        ext = os.path.splitext(image.filename)[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        contents = await image.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="Image size must be under 5MB")

        async with aiofiles.open(filepath, "wb") as f:
            await f.write(contents)

        attachment_url = f"/uploads/{filename}"

    db = get_db()
    now = datetime.utcnow()

    async with db.acquire() as conn:
        ticket_id = await generate_ticket_id(conn)
        row = await conn.fetchrow(
            """
            INSERT INTO tickets (
                ticket_id, issue_description, contact, contact_type,
                second_contact, second_contact_type, user_name,
                status, notes, attachment_url, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            """,
            ticket_id, issueDescription, contact, contactType,
            secondContact or None, secondContactType or None, user_name,
            "Created", "", attachment_url, now, now,
        )

    ticket = serialize(row)
    asyncio.create_task(send_ticket_created_email(ticket))

    return {"message": "Ticket created successfully", "ticketId": ticket_id, "ticket": ticket}


@router.get("/my-tickets")
async def get_my_tickets(x_user_token: Optional[str] = Header(None)):
    """Return tickets for the authenticated user (identified via parent app JWT)."""
    if not x_user_token:
        raise HTTPException(status_code=401, detail="User token required")

    claims = decode_user_token(x_user_token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    phone = claims.get("phone_number")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number in token")

    db = get_db()
    async with db.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM tickets WHERE contact = $1 ORDER BY created_at DESC", phone
        )
    return [serialize(r) for r in rows]


@router.get("")
async def get_tickets(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user=Depends(verify_token),
):
    db = get_db()
    conditions = []
    params = []

    if status and status != "All":
        params.append(status)
        conditions.append(f"status = ${len(params)}")

    if search:
        search_like = f"%{search}%"
        params.append(search_like)
        p1 = len(params)
        params.append(search_like)
        p2 = len(params)
        params.append(search_like)
        p3 = len(params)
        conditions.append(f"(ticket_id ILIKE ${p1} OR contact ILIKE ${p2} OR issue_description ILIKE ${p3})")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with db.acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM tickets {where} ORDER BY created_at DESC", *params)

    return [serialize(r) for r in rows]


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, user=Depends(verify_token)):
    db = get_db()
    async with db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM tickets WHERE ticket_id = $1", ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return serialize(row)


@router.patch("/{ticket_id}")
async def update_ticket(ticket_id: str, body: UpdateTicketRequest, user=Depends(verify_token)):
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    db = get_db()
    async with db.acquire() as conn:
        existing = await conn.fetchrow("SELECT status FROM tickets WHERE ticket_id = $1", ticket_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Ticket not found")
        if existing["status"] == "Closed":
            raise HTTPException(status_code=403, detail="Closed tickets cannot be edited")

        now = datetime.utcnow()
        set_clauses = ["updated_at = $1"]
        params = [now]

        if body.status:
            params.append(body.status)
            set_clauses.append(f"status = ${len(params)}")
            if body.status == "Closed":
                params.append(now)
                set_clauses.append(f"closed_at = ${len(params)}")
        if body.notes is not None:
            params.append(body.notes)
            set_clauses.append(f"notes = ${len(params)}")

        params.append(ticket_id)
        row = await conn.fetchrow(
            f"UPDATE tickets SET {', '.join(set_clauses)} WHERE ticket_id = ${len(params)} RETURNING *",
            *params,
        )

    ticket = serialize(row)
    asyncio.create_task(send_ticket_status_email(ticket))

    return ticket
