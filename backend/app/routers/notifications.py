from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db, serialize_doc, to_object_id
from app.dependencies.auth import get_current_user
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    notes = list(db.notifications.find({
        "$or": [
            {"user_id": user_id},
            {"user_id": current_user.get("role", "")}
        ]
    }).sort("_id", -1).limit(20))

    return [serialize_doc(n) for n in notes]

@router.patch("/{id}/read")
def mark_notification_read(id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    notif = db.notifications.find_one({"_id": to_object_id(id)})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notif.get("user_id") not in [current_user["id"], current_user.get("role", "")]:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only modify your own notifications"
        )

    db.notifications.update_one({"_id": to_object_id(id)}, {"$set": {"read": True}})
    return {"status": "success"}

@router.post("/mark-all-read")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.notifications.update_many(
        {"$or": [{"user_id": current_user["id"]}, {"user_id": current_user.get("role", "")}]},
        {"$set": {"read": True}}
    )
    return {"status": "success"}
