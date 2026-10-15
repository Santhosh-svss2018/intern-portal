from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.database.connection import get_db, serialize_doc, to_object_id
from app.dependencies.auth import get_current_user, require_role
from app.schemas.schemas import AnnouncementCreate, AnnouncementResponse

router = APIRouter(tags=["Announcements"])

@router.post("/api/admin/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    ann_in: AnnouncementCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin creates targeted announcement dispatched to user notifications."""
    db = get_db()
    aud = ann_in.audience.lower().strip()
    if aud not in ["all", "student", "company", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audience must be one of: 'all', 'student', 'company', 'mentor'"
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    now_display = datetime.now(timezone.utc).strftime("%b %d, %Y • %I:%M %p")

    # Resolve target audience from actual users on the server
    user_query = {"is_active": True}
    if aud != "all":
        user_query["role"] = aud

    target_users = list(db.users.find(user_query, {"_id": 1}))
    recipient_count = len(target_users)

    ann_doc = {
        "title": ann_in.title.strip(),
        "message": ann_in.message.strip(),
        "audience": aud,
        "priority": ann_in.priority.lower(),
        "category": ann_in.category or "general",
        "expires_at": ann_in.expires_at,
        "created_by": current_user["id"],
        "creator_email": current_user.get("email", "admin@internconnect.ai"),
        "created_at": now_iso,
        "created_at_display": now_display,
        "recipient_count": recipient_count
    }

    res = db.announcements.insert_one(ann_doc)
    ann_id = str(res.inserted_id)
    ann_doc["id"] = ann_id

    # Create notifications in DB for all target users
    notifications = []
    for u in target_users:
        notifications.append({
            "user_id": str(u["_id"]),
            "title": f"Announcement: {ann_in.title}",
            "message": ann_in.message,
            "type": "info" if ann_in.priority == "info" else ("warning" if ann_in.priority == "warning" else "error"),
            "read": False,
            "created_at": "Just now",
            "announcement_id": ann_id
        })

    if notifications:
        db.notifications.insert_many(notifications)

    # Record audit log
    db.audit_logs.insert_one({
        "actor_id": current_user["id"],
        "actor": current_user.get("email", "Admin"),
        "title": f"Announcement Dispatched: {ann_in.title}",
        "event": f"Dispatched announcement to audience '{aud}' ({recipient_count} recipients)",
        "description": f"Admin sent '{ann_in.title}' to {aud} users",
        "category": "communication",
        "severity": "info" if ann_in.priority == "info" else "warning",
        "timestamp": "Just now",
        "icon": "megaphone"
    })

    return ann_doc

@router.get("/api/admin/announcements")
def get_admin_announcements(current_user: dict = Depends(require_role(["admin"]))):
    """Admin retrieves history of all announcements."""
    db = get_db()
    items = list(db.announcements.find().sort("_id", -1).limit(50))
    return [serialize_doc(i) for i in items]

@router.get("/api/announcements")
def get_user_announcements(current_user: dict = Depends(get_current_user)):
    """Retrieve announcements targeted to the authenticated user's role or all users."""
    db = get_db()
    role = current_user.get("role", "student")

    # Security: users can only see announcements where audience is 'all' or matches their role
    query = {
        "audience": {"$in": ["all", role]}
    }
    items = list(db.announcements.find(query).sort("_id", -1).limit(20))
    return [serialize_doc(i) for i in items]
