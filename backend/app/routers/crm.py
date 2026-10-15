import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.database.connection import get_db, serialize_doc, to_object_id
from app.dependencies.auth import get_current_user, require_role
from app.schemas.schemas import (
    CRMStageUpdate,
    CRMNoteCreate,
    CRMNoteResponse,
    CRMTaskCreate,
    CRMTaskUpdate,
    CRMTaskResponse,
    CRMInterviewOutcomeCreate,
    CRMInterviewOutcomeResponse,
    CRMActivityTimelineItem,
    CRMCandidateCard,
    CRMPipelineResponse,
    CRMCandidatesListResponse,
    CRMCandidateDetail,
    CRMAnalyticsResponse,
    CRMPendingFollowupItem,
    CRMAISummaryResponse,
    CRMAIInterviewQuestionsResponse,
)
from app.services.ai_service import AIService
from app.routers.applications import check_recruiter_ownership

logger = logging.getLogger("internconnect.crm")

router = APIRouter(prefix="/api/crm", tags=["CRM"])

# The 7 canonical recruitment stages
KANBAN_STAGES = [
    "applied",
    "screening",
    "shortlisted",
    "interview",
    "offer",
    "hired",
    "rejected"
]

# Map CRM stages to underlying application status (for backward compatibility)
STAGE_TO_STATUS = {
    "applied": "applied",
    "screening": "in_review",
    "shortlisted": "shortlisted",
    "interview": "interview",
    "offer": "accepted",
    "hired": "hired",
    "rejected": "rejected"
}

# Map database application status to CRM stage
STATUS_TO_STAGE = {
    "applied": "applied",
    "in_review": "screening",
    "screening": "screening",
    "under_review": "screening",
    "under review": "screening",
    "shortlisted": "shortlisted",
    "interview": "interview",
    "accepted": "offer",
    "offer": "offer",
    "selected": "hired",
    "hired": "hired",
    "rejected": "rejected",
    "declined": "rejected"
}

def ensure_crm_indexes(db):
    """Ensure performant indexes on applications collection for CRM searches & filtering."""
    try:
        db.applications.create_index([("company_id", 1), ("status", 1)])
        db.applications.create_index([("internship_id", 1)])
        db.applications.create_index([("student_id", 1)])
        db.applications.create_index([("student_name", "text"), ("skills", "text")])
    except Exception as e:
        logger.debug(f"CRM index setup notice: {e}")

def get_company_scope_filter(current_user: dict, db) -> dict:
    """Build Mongo query filter strictly restricting recruiter visibility to their company postings."""
    if current_user.get("role") == "admin":
        return {}

    user_id = current_user.get("id")
    user_name = current_user.get("full_name")
    user_email = current_user.get("email")

    my_postings = list(db.internships.find({
        "$or": [
            {"company_id": user_id},
            {"company_name": user_name}
        ]
    }))
    int_ids = [str(p["_id"]) for p in my_postings]

    or_clauses = [
        {"company_id": user_id},
        {"company_name": user_name},
        {"internship_id": {"$in": int_ids}}
    ]

    # Seeded demo recruiter accounts support
    if user_email == "recruiter@enterprise.com" or user_name == "TechCorp Ventures":
        or_clauses.append({"company_id": {"$in": ["", None, user_id]}})

    return {"$or": or_clauses}

def build_candidate_card(app_doc: dict) -> CRMCandidateCard:
    """Convert raw application document into compact CRM candidate card."""
    raw_status = (app_doc.get("status") or "applied").lower()
    stage = STATUS_TO_STAGE.get(raw_status, "applied")

    notes = app_doc.get("recruiter_notes") or []
    tasks = app_doc.get("follow_up_tasks") or []
    pending_tasks = sum(1 for t in tasks if not t.get("completed", False))

    latest_note = notes[-1].get("content") if notes else None
    timeline = app_doc.get("activity_timeline") or []
    last_act = timeline[-1].get("timestamp") if timeline else app_doc.get("applied_at")

    return CRMCandidateCard(
        id=str(app_doc["_id"]),
        internship_id=str(app_doc.get("internship_id", "")),
        internship_title=app_doc.get("internship_title", "Internship Opportunity"),
        student_id=str(app_doc.get("student_id", "")),
        student_name=app_doc.get("student_name", "Candidate"),
        student_email=app_doc.get("student_email"),
        student_university=app_doc.get("student_university"),
        student_degree=app_doc.get("student_degree"),
        student_avatar=app_doc.get("student_avatar"),
        skills=app_doc.get("skills", []),
        stage=stage,
        status=raw_status,
        ai_match_percentage=app_doc.get("ai_match_percentage", 85),
        applied_at=str(app_doc.get("applied_at", "Recently")),
        interview_date=app_doc.get("interview_date"),
        interview_notes=app_doc.get("interview_notes"),
        notes_count=len(notes),
        pending_tasks_count=pending_tasks,
        latest_note=latest_note,
        last_activity_at=last_act
    )

# ================= 1. RECRUITER PIPELINE KANBAN =================
@router.get("/pipeline", response_model=CRMPipelineResponse)
def get_recruiter_pipeline(current_user: dict = Depends(require_role(["company", "admin"]))):
    """
    Get full recruitment Kanban board state grouped into 7 stages.
    Strictly scoped to the recruiter's company opportunities.
    """
    db = get_db()
    ensure_crm_indexes(db)
    scope = get_company_scope_filter(current_user, db)

    apps = list(db.applications.find(scope).sort("_id", -1))

    stages_dict = {stage: [] for stage in KANBAN_STAGES}
    stage_counts = {stage: 0 for stage in KANBAN_STAGES}

    for a in apps:
        card = build_candidate_card(a)
        target_stage = card.stage if card.stage in stages_dict else "applied"
        stages_dict[target_stage].append(card)
        stage_counts[target_stage] += 1

    return CRMPipelineResponse(
        stages=stages_dict,
        stage_counts=stage_counts,
        total_candidates=len(apps)
    )

# ================= 2. CANDIDATE MANAGEMENT (SEARCH / FILTER / PAGINATION) =================
@router.get("/candidates", response_model=CRMCandidatesListResponse)
def get_crm_candidates(
    search: Optional[str] = Query(None, description="Search candidate name, skills, or university"),
    stage: Optional[str] = Query(None, description="Filter by Kanban stage"),
    internship_id: Optional[str] = Query(None, description="Filter by target job opportunity"),
    sort_by: str = Query("date_desc", description="Sorting: 'date_desc', 'date_asc', 'match_desc', 'name_asc'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Paginated, searchable candidate directory for recruiters.
    """
    db = get_db()
    ensure_crm_indexes(db)
    query = get_company_scope_filter(current_user, db)

    # Filter by stage
    if stage and stage.lower() != "all":
        stage_clean = stage.lower().strip()
        # Find all statuses that map to this stage
        matching_statuses = [st for st, sg in STATUS_TO_STAGE.items() if sg == stage_clean]
        matching_statuses.append(stage_clean)
        query["status"] = {"$in": list(set(matching_statuses))}

    # Filter by internship
    if internship_id and internship_id.lower() != "all":
        query["internship_id"] = internship_id

    # Search filter (regex across student_name, student_university, or skills)
    if search and search.strip():
        term = search.strip()
        search_regex = {"$regex": term, "$options": "i"}
        search_filter = {
            "$or": [
                {"student_name": search_regex},
                {"student_university": search_regex},
                {"student_degree": search_regex},
                {"student_email": search_regex},
                {"skills": search_regex}
            ]
        }
        if "$or" in query:
            query = {"$and": [query, search_filter]}
        else:
            query["$or"] = search_filter["$or"]

    total = db.applications.count_documents(query)

    # Sort
    sort_spec = [("_id", -1)]
    if sort_by == "date_asc":
        sort_spec = [("_id", 1)]
    elif sort_by == "match_desc":
        sort_spec = [("ai_match_percentage", -1), ("_id", -1)]
    elif sort_by == "name_asc":
        sort_spec = [("student_name", 1)]

    skip = (page - 1) * page_size
    cursor = db.applications.find(query).sort(sort_spec).skip(skip).limit(page_size)
    candidates = [build_candidate_card(doc) for doc in cursor]

    total_pages = max(1, (total + page_size - 1) // page_size)

    return CRMCandidatesListResponse(
        candidates=candidates,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

# ================= 3. CANDIDATE CRM DETAIL =================
@router.get("/candidates/{id}", response_model=CRMCandidateDetail)
def get_crm_candidate_detail(
    id: str,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Retrieve deep CRM candidate profile with recruiter notes, tasks, interview outcomes,
    and unified activity history. Ownership verified.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate application record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only view candidates for your own company postings"
        )

    # Fetch corresponding student profile for rich data (resume, portfolio, links, gpa)
    student_id = app_doc.get("student_id")
    student_profile = db.student_profiles.find_one({"user_id": student_id}) or {}
    student_user = db.users.find_one({"_id": to_object_id(student_id)}) or {}

    raw_status = (app_doc.get("status") or "applied").lower()
    stage = STATUS_TO_STAGE.get(raw_status, "applied")

    recruiter_notes = [
        CRMNoteResponse(
            id=n.get("id", str(uuid.uuid4())[:8]),
            author_id=n.get("author_id", ""),
            author_name=n.get("author_name", "Recruiter"),
            author_role=n.get("author_role", "company"),
            content=n.get("content", ""),
            created_at=n.get("created_at", "")
        )
        for n in (app_doc.get("recruiter_notes") or [])
    ]

    follow_up_tasks = [
        CRMTaskResponse(
            id=t.get("id", str(uuid.uuid4())[:8]),
            title=t.get("title", ""),
            due_date=t.get("due_date"),
            priority=t.get("priority", "medium"),
            assigned_to=t.get("assigned_to"),
            completed=t.get("completed", False),
            completed_at=t.get("completed_at"),
            created_at=t.get("created_at", "")
        )
        for t in (app_doc.get("follow_up_tasks") or [])
    ]

    interview_feedback = [
        CRMInterviewOutcomeResponse(
            id=i.get("id", str(uuid.uuid4())[:8]),
            interviewer_id=i.get("interviewer_id", ""),
            interviewer_name=i.get("interviewer_name", "Interviewer"),
            round_type=i.get("round_type", "Technical Round"),
            rating=i.get("rating", 3),
            recommendation=i.get("recommendation", "hire"),
            strengths=i.get("strengths"),
            concerns=i.get("concerns"),
            notes=i.get("notes"),
            scheduled_date=i.get("scheduled_date"),
            created_at=i.get("created_at", "")
        )
        for i in (app_doc.get("interview_feedback") or [])
    ]

    activity_timeline = [
        CRMActivityTimelineItem(
            id=a.get("id", str(uuid.uuid4())[:8]),
            action=a.get("action", "activity"),
            title=a.get("title", "Event"),
            details=a.get("details"),
            actor_id=a.get("actor_id", ""),
            actor_name=a.get("actor_name", "System"),
            actor_role=a.get("actor_role", "company"),
            timestamp=a.get("timestamp", "")
        )
        for a in (app_doc.get("activity_timeline") or [])
    ]

    status_history = app_doc.get("status_history") or []

    return CRMCandidateDetail(
        id=str(app_doc["_id"]),
        internship_id=str(app_doc.get("internship_id", "")),
        internship_title=app_doc.get("internship_title", "Internship Opportunity"),
        company_id=str(app_doc.get("company_id", "")),
        company_name=app_doc.get("company_name", "Enterprise Hub"),
        student_id=str(student_id),
        student_name=app_doc.get("student_name", "Candidate"),
        student_email=app_doc.get("student_email") or student_user.get("email"),
        student_university=app_doc.get("student_university") or student_profile.get("university"),
        student_degree=app_doc.get("student_degree") or student_profile.get("degree"),
        student_avatar=app_doc.get("student_avatar") or student_user.get("avatar_url"),
        skills=app_doc.get("skills", []) or student_profile.get("skills", []),
        stage=stage,
        status=raw_status,
        ai_match_percentage=app_doc.get("ai_match_percentage", 85),
        ai_insight=app_doc.get("ai_insight"),
        applied_at=str(app_doc.get("applied_at", "Recently")),
        interview_date=app_doc.get("interview_date"),
        interview_notes=app_doc.get("interview_notes"),
        resume_text=app_doc.get("resume_text") or student_profile.get("resume_text"),
        portfolio_url=student_profile.get("portfolio_url"),
        github_url=student_profile.get("github_url"),
        linkedin_url=student_profile.get("linkedin_url"),
        gpa=student_profile.get("gpa"),
        bio=student_profile.get("bio"),
        recruiter_notes=recruiter_notes,
        follow_up_tasks=follow_up_tasks,
        interview_feedback=interview_feedback,
        activity_timeline=activity_timeline,
        status_history=status_history
    )

# ================= 4. STAGE TRANSITIONS & ACTIVITY TIMELINE =================
@router.patch("/candidates/{id}/stage")
def update_candidate_stage(
    id: str,
    stage_data: CRMStageUpdate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Move candidate between permitted Kanban stages with audit history.
    Synchronizes status with existing student application timeline and notifications.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate application record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You cannot move candidates for other companies"
        )

    target_stage = stage_data.stage.lower().strip()
    if target_stage not in KANBAN_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid recruitment stage '{target_stage}'. Permitted stages: {KANBAN_STAGES}"
        )

    current_status = (app_doc.get("status") or "applied").lower()
    current_stage = STATUS_TO_STAGE.get(current_status, "applied")

    # Concurrency verification if provided
    if stage_data.current_stage:
        expected_stage = stage_data.current_stage.lower().strip()
        if expected_stage != current_stage:
            raise HTTPException(
                status_code=409,
                detail=f"Concurrency conflict: expected stage '{expected_stage}' but found '{current_stage}'"
            )

    # Validate terminal states
    if current_stage in ["hired", "rejected"] and target_stage != current_stage:
        # Only allow admin to re-open a finalized decision
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot move candidate from finalized terminal stage '{current_stage}' to '{target_stage}'"
            )

    new_db_status = STAGE_TO_STATUS[target_stage]
    now_iso = datetime.now(timezone.utc).isoformat()
    actor_id = current_user["id"]
    actor_name = current_user.get("full_name", "Recruiter")
    actor_role = current_user.get("role", "company")

    feedback_msg = stage_data.feedback or f"Candidate transitioned to {target_stage.upper()} stage"

    # Status history entry for student timeline
    history_entry = {
        "status": new_db_status,
        "timestamp": now_iso,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "feedback": feedback_msg
    }

    # Unified CRM activity timeline entry
    crm_activity_entry = {
        "id": str(uuid.uuid4())[:8],
        "action": "stage_changed",
        "title": f"Stage Moved to {target_stage.title()}",
        "details": feedback_msg,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "actor_role": actor_role,
        "timestamp": now_iso
    }

    match_filter = {
        "_id": to_object_id(id),
        "status": current_status
    }
    update_op = {
        "$set": {"status": new_db_status},
        "$push": {
            "status_history": history_entry,
            "activity_timeline": crm_activity_entry
        }
    }

    res = db.applications.update_one(match_filter, update_op)
    if res.matched_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Concurrency conflict: Candidate stage was modified concurrently by another recruiter"
        )

    # Trigger notification for student
    student_id = app_doc.get("student_id")
    if student_id:
        notif_msg = f"Your application for {app_doc.get('internship_title')} has progressed to: {target_stage.upper()}."
        if stage_data.feedback:
            notif_msg += f" Note: {stage_data.feedback}"
        db.notifications.insert_one({
            "user_id": student_id,
            "title": "Application Stage Updated",
            "message": notif_msg,
            "type": "success" if target_stage in ["shortlisted", "interview", "offer", "hired"] else "info",
            "read": False,
            "created_at": now_iso
        })

    return {
        "status": "success",
        "message": f"Candidate successfully moved to {target_stage.title()}",
        "stage": target_stage,
        "application_status": new_db_status
    }

# ================= 5. RECRUITER NOTES =================
@router.post("/candidates/{id}/notes", response_model=CRMNoteResponse)
def add_recruiter_note(
    id: str,
    note_data: CRMNoteCreate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Append a confidential recruiter note to candidate profile.
    Visible only to company recruiters and admins.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied: Cannot add note to another company's candidate")

    now_iso = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())[:8]
    author_name = current_user.get("full_name", "Recruiter")

    note_entry = {
        "id": note_id,
        "author_id": current_user["id"],
        "author_name": author_name,
        "author_role": current_user.get("role", "company"),
        "content": note_data.content.strip(),
        "created_at": now_iso
    }

    timeline_entry = {
        "id": str(uuid.uuid4())[:8],
        "action": "note_added",
        "title": "Recruiter Note Added",
        "details": note_data.content.strip()[:120] + ("..." if len(note_data.content.strip()) > 120 else ""),
        "actor_id": current_user["id"],
        "actor_name": author_name,
        "actor_role": current_user.get("role", "company"),
        "timestamp": now_iso
    }

    db.applications.update_one(
        {"_id": to_object_id(id)},
        {
            "$push": {
                "recruiter_notes": note_entry,
                "activity_timeline": timeline_entry
            }
        }
    )

    return note_entry

@router.delete("/candidates/{id}/notes/{note_id}")
def delete_recruiter_note(
    id: str,
    note_id: str,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Delete a recruiter note. Only note author or admin can delete.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    notes = app_doc.get("recruiter_notes") or []
    target_note = next((n for n in notes if n.get("id") == note_id), None)
    if not target_note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Ownership check on note itself
    if current_user.get("role") != "admin" and target_note.get("author_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete notes you created")

    db.applications.update_one(
        {"_id": to_object_id(id)},
        {"$pull": {"recruiter_notes": {"id": note_id}}}
    )

    return {"status": "success", "message": "Recruiter note deleted"}

# ================= 6. FOLLOW-UP TASKS WITH DUE DATES =================
@router.post("/candidates/{id}/tasks", response_model=CRMTaskResponse)
def add_follow_up_task(
    id: str,
    task_data: CRMTaskCreate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Create a scheduled recruiter follow-up task with due date and priority.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    now_iso = datetime.now(timezone.utc).isoformat()
    task_id = str(uuid.uuid4())[:8]
    author_name = current_user.get("full_name", "Recruiter")

    task_entry = {
        "id": task_id,
        "title": task_data.title.strip(),
        "due_date": task_data.due_date,
        "priority": task_data.priority.lower() if task_data.priority else "medium",
        "assigned_to": task_data.assigned_to or author_name,
        "completed": False,
        "completed_at": None,
        "created_at": now_iso
    }

    timeline_entry = {
        "id": str(uuid.uuid4())[:8],
        "action": "task_created",
        "title": f"Follow-up Scheduled: {task_data.title.strip()}",
        "details": f"Due: {task_data.due_date or 'No date'} • Priority: {task_data.priority.upper()}",
        "actor_id": current_user["id"],
        "actor_name": author_name,
        "actor_role": current_user.get("role", "company"),
        "timestamp": now_iso
    }

    db.applications.update_one(
        {"_id": to_object_id(id)},
        {
            "$push": {
                "follow_up_tasks": task_entry,
                "activity_timeline": timeline_entry
            }
        }
    )

    # Create recruiter reminder notification if due date specified
    if task_data.due_date:
        db.notifications.insert_one({
            "user_id": current_user["id"],
            "title": "Recruiter Task Scheduled",
            "message": f"Follow-up task '{task_data.title}' scheduled for {app_doc.get('student_name')} (Due: {task_data.due_date})",
            "type": "info",
            "read": False,
            "created_at": now_iso
        })

    return task_entry

@router.patch("/candidates/{id}/tasks/{task_id}")
def update_follow_up_task(
    id: str,
    task_id: str,
    update_data: CRMTaskUpdate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Toggle task completion or modify details.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    tasks = app_doc.get("follow_up_tasks") or []
    target_task = next((t for t in tasks if t.get("id") == task_id), None)
    if not target_task:
        raise HTTPException(status_code=404, detail="Task not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    if update_data.completed is not None:
        target_task["completed"] = update_data.completed
        target_task["completed_at"] = now_iso if update_data.completed else None

    if update_data.title is not None:
        target_task["title"] = update_data.title.strip()
    if update_data.due_date is not None:
        target_task["due_date"] = update_data.due_date
    if update_data.priority is not None:
        target_task["priority"] = update_data.priority

    action_label = "Completed" if target_task.get("completed") else "Reopened"
    timeline_entry = {
        "id": str(uuid.uuid4())[:8],
        "action": "task_completed" if target_task.get("completed") else "task_updated",
        "title": f"Task {action_label}: {target_task.get('title')}",
        "details": f"Status updated by {current_user.get('full_name', 'Recruiter')}",
        "actor_id": current_user["id"],
        "actor_name": current_user.get("full_name", "Recruiter"),
        "actor_role": current_user.get("role", "company"),
        "timestamp": now_iso
    }

    db.applications.update_one(
        {"_id": to_object_id(id)},
        {
            "$set": {"follow_up_tasks": tasks},
            "$push": {"activity_timeline": timeline_entry}
        }
    )

    return {"status": "success", "task": target_task}

@router.delete("/candidates/{id}/tasks/{task_id}")
def delete_follow_up_task(
    id: str,
    task_id: str,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Remove a follow-up task.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    db.applications.update_one(
        {"_id": to_object_id(id)},
        {"$pull": {"follow_up_tasks": {"id": task_id}}}
    )

    return {"status": "success", "message": "Task removed"}

# ================= 7. INTERVIEW OUTCOMES & FEEDBACK =================
@router.post("/candidates/{id}/interviews", response_model=CRMInterviewOutcomeResponse)
def record_interview_outcome(
    id: str,
    outcome: CRMInterviewOutcomeCreate,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Record an interview outcome with numerical rating (1-5), recommendation, and feedback.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    now_iso = datetime.now(timezone.utc).isoformat()
    feedback_id = str(uuid.uuid4())[:8]
    author_name = current_user.get("full_name", "Interviewer")

    feedback_entry = {
        "id": feedback_id,
        "interviewer_id": current_user["id"],
        "interviewer_name": author_name,
        "round_type": outcome.round_type,
        "rating": outcome.rating,
        "recommendation": outcome.recommendation,
        "strengths": outcome.strengths,
        "concerns": outcome.concerns,
        "notes": outcome.notes,
        "scheduled_date": outcome.scheduled_date or app_doc.get("interview_date"),
        "created_at": now_iso
    }

    timeline_entry = {
        "id": str(uuid.uuid4())[:8],
        "action": "interview_feedback_recorded",
        "title": f"Interview Feedback: {outcome.round_type}",
        "details": f"Score: {outcome.rating}/5 • Recommendation: {outcome.recommendation.replace('_', ' ').upper()}",
        "actor_id": current_user["id"],
        "actor_name": author_name,
        "actor_role": current_user.get("role", "company"),
        "timestamp": now_iso
    }

    update_fields = {}
    if outcome.notes:
        update_fields["interview_notes"] = f"[{outcome.round_type} - {outcome.rating}/5]: {outcome.notes}"
    if outcome.scheduled_date:
        update_fields["interview_date"] = outcome.scheduled_date

    update_op = {
        "$push": {
            "interview_feedback": feedback_entry,
            "activity_timeline": timeline_entry
        }
    }
    if update_fields:
        update_op["$set"] = update_fields

    db.applications.update_one({"_id": to_object_id(id)}, update_op)

    return feedback_entry

# ================= 8. CRM ANALYTICS & CONVERSION FUNNEL =================
@router.get("/analytics", response_model=CRMAnalyticsResponse)
def get_crm_analytics(current_user: dict = Depends(require_role(["company", "admin"]))):
    """
    Calculate conversion funnel analytics and follow-up metrics scoped to recruiter company.
    Computes: applications -> screening -> shortlisted -> interview -> offer -> hired conversion rates.
    """
    db = get_db()
    scope = get_company_scope_filter(current_user, db)

    apps = list(db.applications.find(scope))
    total = len(apps)

    stage_counts = {stage: 0 for stage in KANBAN_STAGES}
    pending_followups = 0
    overdue_tasks = 0
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for a in apps:
        raw_status = (a.get("status") or "applied").lower()
        stage = STATUS_TO_STAGE.get(raw_status, "applied")
        if stage in stage_counts:
            stage_counts[stage] += 1

        for task in (a.get("follow_up_tasks") or []):
            if not task.get("completed", False):
                pending_followups += 1
                due = task.get("due_date")
                if due and due < today_str:
                    overdue_tasks += 1

    applied_c = stage_counts["applied"]
    screen_c = stage_counts["screening"]
    short_c = stage_counts["shortlisted"]
    int_c = stage_counts["interview"]
    offer_c = stage_counts["offer"]
    hire_c = stage_counts["hired"]
    reject_c = stage_counts["rejected"]

    # Funnel cumulative logic
    # Screening reached = total minus pure applied
    advanced_past_applied = total - applied_c
    screening_rate = f"{(advanced_past_applied / total * 100):.1f}%" if total > 0 else "0%"
    shortlist_rate = f"{(short_c + int_c + offer_c + hire_c) / total * 100:.1f}%" if total > 0 else "0%"
    interview_rate = f"{(int_c + offer_c + hire_c) / total * 100:.1f}%" if total > 0 else "0%"
    offer_rate = f"{(offer_c + hire_c) / total * 100:.1f}%" if total > 0 else "0%"
    hire_rate = f"{(hire_c / (offer_c + hire_c) * 100):.1f}%" if (offer_c + hire_c) > 0 else "0%"
    overall_hire = f"{(hire_c / total * 100):.1f}%" if total > 0 else "0%"

    # Active postings count
    postings_query = {"status": "active"}
    if current_user.get("role") == "company":
        postings_query["$or"] = [
            {"company_id": current_user["id"]},
            {"company_name": current_user.get("full_name")}
        ]
    active_postings = db.internships.count_documents(postings_query)

    return CRMAnalyticsResponse(
        applied_count=applied_c,
        screening_count=screen_c,
        shortlisted_count=short_c,
        interview_count=int_c,
        offer_count=offer_c,
        hired_count=hire_c,
        rejected_count=reject_c,
        total_candidates=total,
        screening_rate=screening_rate,
        shortlist_rate=shortlist_rate,
        interview_rate=interview_rate,
        offer_rate=offer_rate,
        hire_rate=hire_rate,
        overall_hire_rate=overall_hire,
        pending_followups_count=pending_followups,
        overdue_tasks_count=overdue_tasks,
        active_postings_count=active_postings
    )

# ================= 9. PENDING FOLLOW-UPS DASHBOARD FEED =================
@router.get("/pending-followups", response_model=List[CRMPendingFollowupItem])
def get_pending_followups(current_user: dict = Depends(require_role(["company", "admin"]))):
    """
    Get all active/uncompleted follow-up tasks across company candidates.
    Sorted by urgency and due date.
    """
    db = get_db()
    scope = get_company_scope_filter(current_user, db)

    # Find applications that have follow_up_tasks
    apps = list(db.applications.find({
        **scope,
        "follow_up_tasks.completed": False
    }))

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    results = []

    for a in apps:
        app_id = str(a["_id"])
        cand_name = a.get("student_name", "Candidate")
        cand_avatar = a.get("student_avatar")
        role_title = a.get("internship_title", "Role")
        cand_id = str(a.get("student_id", ""))

        for t in (a.get("follow_up_tasks") or []):
            if not t.get("completed", False):
                due = t.get("due_date")
                is_overdue = bool(due and due < today_str)
                results.append(
                    CRMPendingFollowupItem(
                        task_id=t.get("id", str(uuid.uuid4())[:8]),
                        application_id=app_id,
                        candidate_id=cand_id,
                        candidate_name=cand_name,
                        candidate_avatar=cand_avatar,
                        internship_title=role_title,
                        title=t.get("title", "Task"),
                        due_date=due,
                        priority=t.get("priority", "medium"),
                        is_overdue=is_overdue,
                        created_at=t.get("created_at", "")
                    )
                )

    # Sort high priority first, then overdue
    priority_weight = {"high": 3, "medium": 2, "low": 1}
    results.sort(key=lambda x: (
        1 if x.is_overdue else 0,
        priority_weight.get(x.priority, 2),
        x.due_date or "9999-99-99"
    ), reverse=True)

    return results

# ================= 10. GEMINI AI CANDIDATE SUMMARY & INTERVIEW QUESTIONS =================
@router.post("/candidates/{id}/ai-summary", response_model=CRMAISummaryResponse)
def get_ai_candidate_summary(
    id: str,
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Use Google Gemini AI to synthesize authorized candidate information and qualifications.
    STRICT COMPLIANCE: AI advises the recruiter; automated hiring decisions are forbidden.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    # Retrieve student profile
    student_id = app_doc.get("student_id")
    profile = db.student_profiles.find_one({"user_id": student_id}) or {}
    internship = db.internships.find_one({"_id": to_object_id(app_doc.get("internship_id"))}) or {}

    candidate_data = {
        "student_name": app_doc.get("student_name"),
        "student_university": app_doc.get("student_university") or profile.get("university"),
        "student_degree": app_doc.get("student_degree") or profile.get("degree"),
        "skills": app_doc.get("skills") or profile.get("skills", []),
        "resume_text": app_doc.get("resume_text") or profile.get("resume_text", ""),
    }

    job_data = {
        "title": app_doc.get("internship_title") or internship.get("title"),
        "company_name": app_doc.get("company_name") or internship.get("company_name"),
        "skills_required": internship.get("skills_required") or app_doc.get("skills", [])
    }

    result = AIService.generate_candidate_crm_summary(candidate_data, job_data)
    return CRMAISummaryResponse(**result)

@router.post("/candidates/{id}/ai-interview-questions", response_model=CRMAIInterviewQuestionsResponse)
def get_ai_interview_questions(
    id: str,
    round_type: str = Query("Technical Round", description="e.g. Technical Round, System Design, Behavioral"),
    current_user: dict = Depends(require_role(["company", "admin"]))
):
    """
    Use Google Gemini AI to generate role-tailored technical & behavioral interview questions
    with follow-up probing prompts based on candidate's background and target role.
    """
    db = get_db()
    app_doc = db.applications.find_one({"_id": to_object_id(id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Candidate record not found")

    if not check_recruiter_ownership(app_doc, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    student_id = app_doc.get("student_id")
    profile = db.student_profiles.find_one({"user_id": student_id}) or {}
    internship = db.internships.find_one({"_id": to_object_id(app_doc.get("internship_id"))}) or {}

    candidate_data = {
        "student_name": app_doc.get("student_name"),
        "skills": app_doc.get("skills") or profile.get("skills", []),
    }

    job_data = {
        "title": app_doc.get("internship_title") or internship.get("title"),
        "company_name": app_doc.get("company_name") or internship.get("company_name"),
        "skills_required": internship.get("skills_required") or []
    }

    result = AIService.generate_crm_interview_questions(candidate_data, job_data, round_type=round_type)
    return CRMAIInterviewQuestionsResponse(**result)
