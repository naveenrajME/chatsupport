from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional
from datetime import datetime
from database import get_db
from dependencies import verify_token
from services.email_service import send_ticket_created_email, send_ticket_status_email
from pydantic import BaseModel
import asyncio
import aiofiles
import os
import uuid

router = APIRouter(prefix="/api/tickets", tags=["tickets"], redirect_slashes=False)

VALID_STATUSES = ["Created", "Assigned", "Fixed", "Closed"]
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


async def generate_ticket_id(db) -> str:
    last = await db["tickets"].find_one({}, sort=[("createdAt", -1)])
    next_num = 1
    if last and last.get("ticketId"):
        parts = last["ticketId"].split("-")
        try:
            next_num = int(parts[-1]) + 1
        except ValueError:
            pass
    return f"TK-SAAFE-{str(next_num).zfill(3)}"


def serialize(ticket: dict) -> dict:
    ticket["_id"] = str(ticket["_id"])
    return ticket


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@router.post("", status_code=201)
async def create_ticket(
    issueDescription: str = Form(...),
    contact: str = Form(...),
    contactType: str = Form(...),
    image: Optional[UploadFile] = File(None),
):
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
    ticket_id = await generate_ticket_id(db)
    now = datetime.utcnow()

    ticket = {
        "ticketId": ticket_id,
        "issueDescription": issueDescription,
        "contact": contact,
        "contactType": contactType,
        "status": "Created",
        "notes": "",
        "attachmentUrl": attachment_url,
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db["tickets"].insert_one(ticket)
    ticket["_id"] = str(result.inserted_id)

    asyncio.create_task(send_ticket_created_email(ticket))

    return {"message": "Ticket created successfully", "ticketId": ticket_id, "ticket": ticket}


@router.get("")
async def get_tickets(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user=Depends(verify_token),
):
    db = get_db()
    query = {}

    if status and status != "All":
        query["status"] = status

    if search:
        query["$or"] = [
            {"ticketId": {"$regex": search, "$options": "i"}},
            {"contact": {"$regex": search, "$options": "i"}},
            {"issueDescription": {"$regex": search, "$options": "i"}},
        ]

    cursor = db["tickets"].find(query).sort("createdAt", -1)
    tickets = [serialize(t) async for t in cursor]
    return tickets


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, user=Depends(verify_token)):
    db = get_db()
    ticket = await db["tickets"].find_one({"ticketId": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return serialize(ticket)


@router.patch("/{ticket_id}")
async def update_ticket(ticket_id: str, body: UpdateTicketRequest, user=Depends(verify_token)):
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    db = get_db()

    # Prevent editing a closed ticket
    existing = await db["tickets"].find_one({"ticketId": ticket_id})
    if existing and existing.get("status") == "Closed":
        raise HTTPException(status_code=403, detail="Closed tickets cannot be edited")

    update = {"updatedAt": datetime.utcnow()}
    if body.status:
        update["status"] = body.status
    if body.notes is not None:
        update["notes"] = body.notes

    ticket = await db["tickets"].find_one_and_update(
        {"ticketId": ticket_id},
        {"$set": update},
        return_document=True,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket = serialize(ticket)
    asyncio.create_task(send_ticket_status_email(ticket))

    return ticket
