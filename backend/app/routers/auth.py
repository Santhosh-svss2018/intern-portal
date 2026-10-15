import secrets
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import hash_password, verify_password, create_access_token
from app.database.connection import get_db, serialize_doc, to_object_id
from app.dependencies.auth import get_current_user
from app.schemas.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    ForgotPasswordRequest, PasswordResetConfirm, StudentProfileUpdate
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

_FAILED_LOGINS = defaultdict(list)
_RATE_LIMIT_WINDOW = 60 # seconds
_MAX_FAILED_ATTEMPTS = 5

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    db = get_db()
    existing_user = db.users.find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Normalize role - prevent privilege escalation via self-assigned admin
    role = user_in.role.lower().strip()
    if role not in ["student", "company", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Public registration only allows 'student', 'company', or 'mentor'"
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    new_user = {
        "email": user_in.email.lower(),
        "password_hash": hash_password(user_in.password),
        "role": role,
        "full_name": user_in.full_name,
        "avatar_url": "",
        "is_active": True,
        "created_at": now_iso
    }
    try:
        result = db.users.insert_one(new_user)
    except Exception as e:
        if "duplicate key" in str(e).lower() or "e11000" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists"
            )
        raise e
    user_id = str(result.inserted_id)

    # Create associated profile
    if role == "student":
        db.student_profiles.insert_one({
            "user_id": user_id,
            "university": user_in.organization or "",
            "degree": user_in.title or "",
            "grad_year": "",
            "readiness_score": 20,
            "skills": [],
            "portfolio_url": "",
            "github_url": "",
            "linkedin_url": "",
            "resume_text": ""
        })
    elif role == "company":
        db.company_profiles.insert_one({
            "user_id": user_id,
            "company_name": user_in.organization or user_in.full_name,
            "industry": "Technology",
            "tier": "Standard Employer",
            "verification_status": "pending",
            "logo_initial": (user_in.organization or user_in.full_name)[:2].upper(),
            "active_roles_count": 0
        })
    elif role == "mentor":
        db.mentor_profiles.insert_one({
            "user_id": user_id,
            "title": user_in.title or "Technical Mentor",
            "organization": user_in.organization or "Independent",
            "specialties": ["Software Engineering", "Career Guidance"],
            "capacity": 5,
            "active_mentees": 0
        })

    token = create_access_token({"sub": user_id, "role": role, "email": user_in.email.lower()})
    clean_user = serialize_doc(new_user)
    clean_user.pop("password_hash", None)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=clean_user
    )

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin):
    key = login_data.email.lower().strip()
    now = time.time()
    
    # Clean up expired attempt records
    _FAILED_LOGINS[key] = [t for t in _FAILED_LOGINS[key] if now - t < _RATE_LIMIT_WINDOW]
    if len(_FAILED_LOGINS[key]) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds before trying again."
        )

    db = get_db()
    user = db.users.find_one({"email": key})
    if not user or not verify_password(login_data.password, user.get("password_hash", "")):
        _FAILED_LOGINS[key].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Success: reset rate limit tracking
    _FAILED_LOGINS.pop(key, None)

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact platform administrators.",
        )

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "role": user["role"], "email": user["email"]})
    clean_user = serialize_doc(user)
    clean_user.pop("password_hash", None)

    # Attach profile info
    if user["role"] == "student":
        prof = db.student_profiles.find_one({"user_id": user_id})
        clean_user["profile"] = serialize_doc(prof) if prof else {}
    elif user["role"] == "company":
        prof = db.company_profiles.find_one({"user_id": user_id})
        clean_user["profile"] = serialize_doc(prof) if prof else {}
    elif user["role"] == "mentor":
        prof = db.mentor_profiles.find_one({"user_id": user_id})
        clean_user["profile"] = serialize_doc(prof) if prof else {}

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=clean_user
    )

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    role = current_user.get("role")
    
    profile = {}
    if role == "student":
        p = db.student_profiles.find_one({"user_id": user_id})
        profile = serialize_doc(p) if p else {}
    elif role == "company":
        p = db.company_profiles.find_one({"user_id": user_id})
        profile = serialize_doc(p) if p else {}
    elif role == "mentor":
        p = db.mentor_profiles.find_one({"user_id": user_id})
        profile = serialize_doc(p) if p else {}

    res = dict(current_user)
    res.pop("password_hash", None)
    res["profile"] = profile
    return res

@router.put("/profile")
def update_profile(profile_data: StudentProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    role = current_user.get("role")

    if role == "student":
        update_fields = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        
        # Calculate dynamic readiness score accurately
        if "readiness_score" not in update_fields:
            existing = db.student_profiles.find_one({"user_id": user_id}) or {}
            combined = {**existing, **update_fields}
            score = 0
            if current_user.get("full_name") and current_user.get("email"):
                score += 20
            if combined.get("university") and combined.get("degree"):
                score += 20
            if combined.get("skills") and len(combined["skills"]) >= 3:
                score += 20
            if combined.get("portfolio_url") or combined.get("github_url") or combined.get("linkedin_url"):
                score += 20
            if combined.get("resume_text") and len(str(combined["resume_text"]).strip()) > 20:
                score += 20
            update_fields["readiness_score"] = min(score, 100)

        db.student_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_fields},
            upsert=True
        )
        updated_profile = db.student_profiles.find_one({"user_id": user_id})
        return {
            "status": "success",
            "message": "Profile updated successfully",
            "profile": serialize_doc(updated_profile) if updated_profile else {}
        }
    elif role == "company":
        update_fields = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        db.company_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_fields},
            upsert=True
        )
        updated_profile = db.company_profiles.find_one({"user_id": user_id})
        return {
            "status": "success",
            "message": "Company profile updated successfully",
            "profile": serialize_doc(updated_profile) if updated_profile else {}
        }
    elif role == "mentor":
        update_fields = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        db.mentor_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_fields},
            upsert=True
        )
        updated_profile = db.mentor_profiles.find_one({"user_id": user_id})
        return {
            "status": "success",
            "message": "Mentor profile updated successfully",
            "profile": serialize_doc(updated_profile) if updated_profile else {}
        }
    
    return {"status": "success", "message": "Profile updated"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    db = get_db()
    email = req.email.lower().strip()
    user = db.users.find_one({"email": email})
    
    # Generate cryptographic token
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=1)).isoformat()
    now_iso = now.isoformat()

    if user:
        # Invalidate any prior active tokens for this user
        db.password_resets.update_many(
            {"user_id": str(user["_id"]), "is_used": False},
            {"$set": {"is_used": True, "invalidated_at": now_iso}}
        )
        
        # Store new token
        db.password_resets.insert_one({
            "token": raw_token,
            "user_id": str(user["_id"]),
            "email": email,
            "created_at": now_iso,
            "expires_at": expires_at,
            "is_used": False
        })
        
        # Audit log event
        db.audit_logs.insert_one({
            "title": f"Password Reset Requested: {email}",
            "description": f"One-time password reset token initiated for {email}",
            "category": "security",
            "timestamp": "Just now",
            "icon": "lock"
        })

    return {
        "status": "success",
        "message": f"If an account exists for {email}, a secure password reset token has been generated.",
        "reset_token": raw_token if user else None,
        "mode": "development_token" if user else "standard"
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm):
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    reset_record = db.password_resets.find_one({
        "token": req.token,
        "is_used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token"
        )
        
    if reset_record.get("expires_at", "") < now_iso:
        db.password_resets.update_one(
            {"_id": reset_record["_id"]},
            {"$set": {"is_used": True, "expired": True}}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )
        
    user_id = reset_record["user_id"]
    hashed = hash_password(req.new_password)
    
    db.users.update_one(
        {"_id": to_object_id(user_id)},
        {"$set": {
            "password_hash": hashed,
            "password_updated_at": now_iso
        }}
    )
    
    # Mark token as used (single-use enforcement)
    db.password_resets.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"is_used": True, "used_at": now_iso}}
    )
    
    # Audit log
    db.audit_logs.insert_one({
        "title": f"Password Reset Completed: {reset_record.get('email')}",
        "description": f"User password updated successfully via secure reset token",
        "category": "security",
        "timestamp": "Just now",
        "icon": "key"
    })
    
    return {
        "status": "success",
        "message": "Password has been successfully updated. You may now log in with your new credentials."
    }

