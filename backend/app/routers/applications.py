import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.database.connection import get_db, serialize_doc, to_object_id
from app.dependencies.auth import get_current_user, require_role
from app.schemas.schemas import ApplicationCreate, ApplicationStatusUpdate, ApplicationResponse
from app.services.ai_service import AIService

logger = logging.getLogger("internconnect.applications")

VALID_STATUSES = {"applied", "in_review", "screening", "shortlisted", "interview", "rejected", "accepted", "offer", "hired"}
TERMINAL_STATUSES = {"rejected", "accepted", "hired"}

def check_recruiter_ownership(app_doc: dict, current_user: dict, db) -> bool:
    user_id = current_user.get("id")
    user_name = current_user.get("full_name")
    user_email = current_user.get("email")

    # 1. Direct company ID match
    if app_doc.get("company_id") and app_doc.get("company_id") == user_id:
        return True

    # 2. Direct company name match
    if app_doc.get("company_name") and user_name and app_doc.get("company_name").strip().lower() == user_name.strip().lower():
        return True

    # 3. Matching internship posting ownership
    internship_id = app_doc.get("internship_id")
    if internship_id:
        internship = db.internships.find_one({"_id": to_object_id(internship_id)})
        if internship:
            if internship.get("company_id") and internship.get("company_id") == user_id:
                return True
            if internship.get("company_name") and user_name and internship.get("company_name").strip().lower() == user_name.strip().lower():
                return True

    # 4. Default seeded recruiter account ("recruiter@enterprise.com" / "TechCorp Ventures")
    # manages initial seeded mock postings for demo purposes
    if user_email == "recruiter@enterprise.com" or user_name == "TechCorp Ventures":
        if not app_doc.get("company_id") or str(app_doc.get("company_id")) in ["", user_id]:
            return True

    return False

router = APIRouter(prefix="/api/applications", tags=["Applications"])

@router.post("", response_model=ApplicationResponse)
def submit_application(
    app_data: ApplicationCreate,
    current_user: dict = Depends(require_role(["student"]))
):
    db = get_db()
    internship = db.internships.find_one({"_id": to_object_id(app_data.internship_id)})
    if not internship:
        raise HTTPException(status_code=404, detail="Target internship opportunity not found")

    # Check for existing application
    existing = db.applications.find_one({
        "internship_id": app_data.internship_id,
        "student_id": current_user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted an application for this role")

    # Retrieve student profile
    student_profile = db.student_profiles.find_one({"user_id": current_user["id"]}) or {}
    student_skills = student_profile.get("skills", ["React", "JavaScript", "Python"])
    
    # Calculate AI skill match
    match_result = AIService.calculate_skill_match(
        student_skills=student_skills,
        required_skills=internship.get("skills_required", [])
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    initial_history = [{
        "status": "applied",
        "timestamp": now_iso,
        "actor_id": current_user["id"],
        "actor_role": current_user.get("role", "student"),
        "feedback": "Application submitted by candidate"
    }]

    new_app = {
        "internship_id": app_data.internship_id,
        "internship_title": internship.get("title", "Internship"),
        "company_id": str(internship.get("company_id", "")),
        "company_name": internship.get("company_name", "Enterprise Hub"),
        "student_id": current_user["id"],
        "student_name": current_user.get("full_name", "Student Candidate"),
        "student_university": student_profile.get("university", "Stanford University"),
        "student_degree": student_profile.get("degree", "Computer Science"),
        "student_avatar": current_user.get("avatar_url", ""),
        "skills": student_skills,
        "status": "applied",
        "ai_match_percentage": match_result["match_percentage"],
        "ai_insight": match_result["insight"],
        "applied_at": "Just now",
        "interview_date": None,
        "interview_notes": None,
        "status_history": initial_history
    }

    res = db.applications.insert_one(new_app)
    new_app["id"] = str(res.inserted_id)

    # Dispatch notification to company if available
    db.notifications.insert_one({
        "user_id": internship.get("company_id", "recruiter"),
        "title": "New Candidate Application",
        "message": f"{current_user.get('full_name')} applied for {internship.get('title')}",
        "type": "info",
        "read": False,
        "created_at": "Just now"
    })

    return new_app

@router.get("/my", response_model=List[ApplicationResponse])
def get_my_applications(current_user: dict = Depends(require_role(["student"]))):
    db = get_db()
    apps = list(db.applications.find({"student_id": current_user["id"]}).sort("_id", -1))
    return [serialize_doc(a) for a in apps]

@router.get("/company", response_model=List[ApplicationResponse])
def get_company_applications(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    db = get_db()
    query = {}
    if current_user.get("role") == "company":
        my_postings = list(db.internships.find({
            "$or": [
                {"company_id": current_user["id"]},
                {"company_name": current_user.get("full_name")}
            ]
        }))
        int_ids = [str(p["_id"]) for p in my_postings]
        query["$or"] = [
            {"company_id": current_user["id"]},
            {"company_name": current_user.get("full_name")},
            {"internship_id": {"$in": int_ids}}
        ]

    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()

    apps = list(db.applications.find(query).sort("_id", -1))
    return [serialize_doc(a) for a in apps]

@router.get("/stats")
def get_pipeline_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    role = current_user.get("role")
    
    if role == "student":
        user_apps = list(db.applications.find({"student_id": current_user["id"]}))
        total = len(user_apps)
        in_review = sum(1 for a in user_apps if a.get("status") in ["in_review", "applied", "under review"])
        shortlisted = sum(1 for a in user_apps if a.get("status") == "shortlisted")
        interviews = sum(1 for a in user_apps if a.get("status") == "interview")
        conversion_rate = f"{(shortlisted + interviews) / total * 100:.0f}%" if total > 0 else "0%"
        
        upcoming_interview = None
        for a in user_apps:
            if a.get("status") == "interview":
                details = a.get("interview_details") or {}
                if details.get("date"):
                    time_str = f" at {details.get('time')}" if details.get('time') else ""
                    upcoming_interview = f"{details.get('date')}{time_str}"
                    break
        if not upcoming_interview and interviews > 0:
            upcoming_interview = "Scheduled"

        return {
            "applied": total,
            "in_review": in_review,
            "shortlisted": shortlisted,
            "interviews": interviews,
            "conversion_rate": conversion_rate,
            "upcoming_interview": upcoming_interview
        }
    elif role == "company":
        my_postings = list(db.internships.find({
            "$or": [
                {"company_id": current_user["id"]},
                {"company_name": current_user.get("full_name")}
            ]
        }))
        int_ids = [str(p["_id"]) for p in my_postings]
        company_apps = list(db.applications.find({
            "$or": [
                {"company_id": current_user["id"]},
                {"company_name": current_user.get("full_name")},
                {"internship_id": {"$in": int_ids}}
            ]
        }))
        total = len(company_apps)
        shortlisted = sum(1 for a in company_apps if a.get("status") == "shortlisted")
        interviews = sum(1 for a in company_apps if a.get("status") == "interview")
        active_posts = len([p for p in my_postings if p.get("status") == "active"])
        return {
            "active_postings": active_posts,
            "total_applicants": total,
            "shortlisted": shortlisted,
            "interviews": interviews
        }
    else:
        # Admin / Recruiter fallback stats
        total = db.applications.count_documents({})
        shortlisted = db.applications.count_documents({"status": "shortlisted"})
        interviews = db.applications.count_documents({"status": "interview"})
        active_posts = db.internships.count_documents({"status": "active"})
        return {
            "active_postings": active_posts,
            "total_applicants": total,
            "shortlisted": shortlisted,
            "interviews": interviews
        }

@router.get("/{id}", response_model=ApplicationResponse)
def get_application_detail(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    if user_role == "student":
        if app_doc.get("student_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only view your own applications"
            )
    elif user_role == "company":
        if not check_recruiter_ownership(app_doc, current_user, db):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only view applications for your own postings"
            )
    elif user_role == "admin":
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    return serialize_doc(app_doc)

@router.patch("/{id}/status")
def update_application_status(
    id: str,
    status_update: ApplicationStatusUpdate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    user_role = current_user.get("role")
    user_id = current_user.get("id")

    # Enforce recruiter ownership authorization
    if user_role == "company":
        if not check_recruiter_ownership(app_doc, current_user, db):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only update applications for your own postings"
            )

    STATUS_ALIAS_MAP = {
        "under_review": "in_review",
        "under review": "in_review",
        "screening": "in_review",
        "offer": "accepted",
        "selected": "accepted",
        "declined": "rejected"
    }

    raw_status = status_update.status.lower().strip()
    new_status = STATUS_ALIAS_MAP.get(raw_status, raw_status)

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Allowed statuses: {sorted(list(VALID_STATUSES))}"
        )

    current_status = app_doc.get("status", "applied").lower()

    # Concurrency check if expected current status was supplied
    if status_update.current_status:
        expected_current = status_update.current_status.lower().strip()
        expected_current = STATUS_ALIAS_MAP.get(expected_current, expected_current)
        if expected_current != current_status:
            raise HTTPException(
                status_code=409,
                detail=f"Concurrency conflict: expected current status '{status_update.current_status}' but found '{current_status}'"
            )

    # Reject invalid transition from terminal states (allow accepted -> hired)
    if current_status in TERMINAL_STATUSES:
        if not (current_status == "accepted" and new_status == "hired") and new_status != current_status:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition application from terminal status '{current_status}' to '{new_status}'"
            )

    now_iso = datetime.now(timezone.utc).isoformat()
    update_fields = {"status": new_status}
    if status_update.interview_date is not None:
        update_fields["interview_date"] = status_update.interview_date
    if status_update.interview_notes is not None:
        update_fields["interview_notes"] = status_update.interview_notes

    feedback_text = status_update.feedback or status_update.interview_notes
    history_entry = {
        "status": new_status,
        "timestamp": now_iso,
        "actor_id": user_id,
        "actor_role": user_role,
        "feedback": feedback_text
    }

    # Concurrency-safe atomic MongoDB update
    match_filter = {
        "_id": to_object_id(id),
        "status": current_status
    }
    update_op = {
        "$set": update_fields,
        "$push": {"status_history": history_entry}
    }

    res = db.applications.update_one(match_filter, update_op)
    if res.matched_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Concurrency conflict: Application status was modified concurrently by another transaction"
        )

    # Explicit retry strategy for student notification
    student_id = app_doc.get("student_id")
    if student_id:
        msg = f"Your application status for {app_doc.get('internship_title')} at {app_doc.get('company_name')} is now: {new_status.upper()}."
        if status_update.interview_date:
            msg += f" Interview Scheduled: {status_update.interview_date}"
        if feedback_text:
            msg += f" Feedback: {feedback_text}"

        notif_doc = {
            "user_id": student_id,
            "title": "Application Status Updated",
            "message": msg,
            "type": "success" if new_status in ["shortlisted", "interview", "accepted"] else "info",
            "read": False,
            "created_at": now_iso
        }

        notification_sent = False
        for attempt in range(3):
            try:
                db.notifications.insert_one(notif_doc)
                notification_sent = True
                break
            except Exception as notif_err:
                logger.warning(f"Notification attempt {attempt+1} failed: {notif_err}")

        if not notification_sent:
            logger.error(f"Notification delivery failed for application {id} to student {student_id}")
            db.applications.update_one(
                {"_id": to_object_id(id)},
                {"$set": {"notification_delivery_failed": True, "pending_notification": notif_doc}}
            )

    return {"status": "success", "message": f"Candidate status updated to {new_status}"}

