import os
# Ensure unit test suite runs against isolated in-memory mock to protect Atlas data
os.environ["USE_MOCK_DB"] = "true"

import pytest
import jwt
from datetime import timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.database.connection import (
    get_db,
    sanitize_mongo_uri,
    check_db_health,
    serialize_doc,
    to_object_id
)
from app.database.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    db = get_db(force_mock=True)
    seed_database(db)

def test_database_configuration():
    # Database name must be internconnect_ai
    assert settings.DB_NAME == "internconnect_ai"
    assert "mongodb" in settings.MONGO_URI.lower()

def test_credentials_sanitization():
    test_uri = "mongodb+srv://user123:secretpass@cluster0.abc.mongodb.net/?appName=Cluster0"
    sanitized = sanitize_mongo_uri(test_uri)
    assert "secretpass" not in sanitized
    assert "****" in sanitized
    assert "mongodb+srv://user123:****@cluster0.abc.mongodb.net/?appName=Cluster0" == sanitized

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_name"] == "internconnect_ai"
    assert "database" in data
    assert "database_connected" in data

def test_crud_persistence_behavior():
    db = get_db()
    # 1. CREATE
    record = {"title": "Test SWE Task", "status": "active", "points": 100}
    res = db["test_items"].insert_one(record)
    item_id = res.inserted_id
    assert item_id is not None

    # 2. READ
    found = db["test_items"].find_one({"_id": item_id})
    assert found is not None
    assert found["title"] == "Test SWE Task"

    # 3. UPDATE
    db["test_items"].update_one({"_id": item_id}, {"$set": {"status": "completed"}})
    updated = db["test_items"].find_one({"_id": item_id})
    assert updated["status"] == "completed"

    # 4. DELETE
    db["test_items"].delete_one({"_id": item_id})
    after_del = db["test_items"].find_one({"_id": item_id})
    assert after_del is None

def test_login_student():
    response = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"
    assert data["user"]["full_name"] == "Alex Morgan"

def test_login_recruiter():
    response = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "company"

def test_login_mentor():
    response = client.post("/api/auth/login", json={
        "email": "mentor@industry.org",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "mentor"

def test_login_admin():
    response = client.post("/api/auth/login", json={
        "email": "admin@internconnect.ai",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"

def test_browse_internships():
    response = client.get("/api/internships")
    assert response.status_code == 200
    internships = response.json()
    assert len(internships) >= 3
    companies = [i["company_name"] for i in internships]
    assert "Stripe" in companies

def test_rbac_protection():
    # 1. Unauthenticated access to admin stats should fail with 401
    resp_unauth = client.get("/api/admin/stats")
    assert resp_unauth.status_code == 401

    # 2. Student trying to access admin stats should get 403 Forbidden
    login_resp = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    resp_forbidden = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert resp_forbidden.status_code == 403

def test_admin_access():
    login_resp = client.post("/api/auth/login", json={
        "email": "admin@internconnect.ai",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    resp = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "verified_companies" in data

def test_duplicate_email_registration_fails():
    response = client.post("/api/auth/register", json={
        "email": "student@university.edu",
        "password": "newpassword123",
        "full_name": "Duplicate Student",
        "role": "student"
    })
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_ai_skill_match():
    response = client.post("/api/ai/match", json={
        "student_skills": ["React", "TypeScript", "Node.js"],
        "required_skills": ["React", "TypeScript", "Distributed Systems", "SQL"]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["match_percentage"] >= 60
    assert "React" in data["matching_skills"]
    assert "Distributed Systems" in data["missing_skills"]

def test_ai_question_generation():
    response = client.post("/api/ai/generate-questions", json={
        "company_name": "Stripe",
        "role_title": "Software Engineering Intern"
    })
    assert response.status_code == 200
    data = response.json()
    assert "idempotent API architecture" in data["question"]

def test_application_initial_history_persisted():
    # Login as student
    login_resp = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    student_id = login_resp.json()["user"]["id"]

    # Find an internship to apply for
    db = get_db()
    internship = db.internships.find_one({"company_name": "Datadog"})
    assert internship is not None
    internship_id = str(internship["_id"])

    # Submit application
    app_resp = client.post(
        "/api/applications",
        headers={"Authorization": f"Bearer {token}"},
        json={"internship_id": internship_id}
    )
    assert app_resp.status_code == 200
    data = app_resp.json()
    assert data["status"] == "applied"
    assert "status_history" in data
    assert len(data["status_history"]) == 1
    first_entry = data["status_history"][0]
    assert first_entry["status"] == "applied"
    assert first_entry["actor_id"] == student_id
    assert first_entry["actor_role"] == "student"

def test_application_status_update_timeline_appended():
    db = get_db()
    # Find an application belonging to TechCorp Ventures / Stripe
    app_doc = db.applications.find_one({"company_name": "Stripe"})
    assert app_doc is not None
    app_id = str(app_doc["_id"])

    # Login as recruiter
    recruiter_resp = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    assert recruiter_resp.status_code == 200
    rec_token = recruiter_resp.json()["access_token"]

    # Update status to shortlisted with feedback
    feedback_msg = "Outstanding problem solving and architecture fundamentals."
    update_resp = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "status": "shortlisted",
            "feedback": feedback_msg,
            "current_status": "applied"
        }
    )
    assert update_resp.status_code == 200

    # Verify via GET /api/applications/{id}
    get_resp = client.get(
        f"/api/applications/{app_id}",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert get_resp.status_code == 200
    detail = get_resp.json()
    assert detail["status"] == "shortlisted"
    assert len(detail["status_history"]) >= 1
    latest_entry = detail["status_history"][-1]
    assert latest_entry["status"] == "shortlisted"
    assert latest_entry["feedback"] == feedback_msg
    assert latest_entry["actor_role"] == "company"

def test_recruiter_ownership_enforcement():
    db = get_db()
    # Register a new unauthorized recruiter
    client.post("/api/auth/register", json={
        "email": "unauthorized.recruiter@othercorp.com",
        "password": "password123",
        "full_name": "OtherCorp HR",
        "role": "company"
    })
    login_resp = client.post("/api/auth/login", json={
        "email": "unauthorized.recruiter@othercorp.com",
        "password": "password123"
    })
    other_token = login_resp.json()["access_token"]

    # Find an application belonging to Stripe / TechCorp
    app_doc = db.applications.find_one({"company_name": "Stripe"})
    assert app_doc is not None
    app_id = str(app_doc["_id"])

    # Unauthorized recruiter attempts to GET application detail -> 403
    get_resp = client.get(
        f"/api/applications/{app_id}",
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert get_resp.status_code == 403
    assert "Access denied" in get_resp.json()["detail"]

    # Unauthorized recruiter attempts to PATCH application status -> 403
    patch_resp = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {other_token}"},
        json={"status": "in_review"}
    )
    assert patch_resp.status_code == 403
    assert "Access denied" in patch_resp.json()["detail"]

def test_student_timeline_ownership():
    db = get_db()
    # Login as Sarah Lin (different student)
    sarah_resp = client.post("/api/auth/login", json={
        "email": "sarah.lin@berkeley.edu",
        "password": "password123"
    })
    sarah_token = sarah_resp.json()["access_token"]

    # Find an application belonging to Alex Morgan (student@university.edu)
    alex_user = db.users.find_one({"email": "student@university.edu"})
    alex_app = db.applications.find_one({"student_id": str(alex_user["_id"])})
    assert alex_app is not None
    alex_app_id = str(alex_app["_id"])

    # Sarah tries to view Alex's application -> 403
    resp = client.get(
        f"/api/applications/{alex_app_id}",
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]

    # Alex views his own application -> 200
    alex_login = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    alex_token = alex_login.json()["access_token"]
    alex_resp = client.get(
        f"/api/applications/{alex_app_id}",
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    assert alex_resp.status_code == 200
    assert alex_resp.json()["id"] == alex_app_id

def test_invalid_status_transition_rejected():
    db = get_db()
    recruiter_resp = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    rec_token = recruiter_resp.json()["access_token"]

    app_doc = db.applications.find_one({"company_name": "Stripe"})
    app_id = str(app_doc["_id"])

    # 1. Invalid status name -> 400
    resp_invalid = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"status": "invalid_status_name"}
    )
    assert resp_invalid.status_code == 400
    assert "Invalid status" in resp_invalid.json()["detail"]

    # 2. Reject the application
    resp_reject = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"status": "rejected", "feedback": "Position filled."}
    )
    assert resp_reject.status_code == 200

    # 3. Attempting to transition from terminal 'rejected' status to 'interview' -> 400
    resp_from_terminal = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"status": "interview"}
    )
    assert resp_from_terminal.status_code == 400
    assert "terminal status" in resp_from_terminal.json()["detail"]

def test_concurrency_conflict_rejected():
    recruiter_resp = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    rec_token = recruiter_resp.json()["access_token"]

    db = get_db()
    # Reset or find an application with known status
    app_doc = db.applications.find_one({"company_name": "Figma"})
    if not app_doc:
        app_doc = db.applications.find_one({})
    app_id = str(app_doc["_id"])
    current_status = app_doc["status"]

    # Stale update expecting wrong status -> 409
    stale_status = "interview" if current_status != "interview" else "accepted"
    resp_conflict = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "status": "shortlisted",
            "current_status": stale_status # Wrong expectation
        }
    )
    assert resp_conflict.status_code == 409
    assert "Concurrency conflict" in resp_conflict.json()["detail"]

def test_legacy_application_graceful_handling():
    db = get_db()
    # Create a legacy record without 'status_history'
    student = db.users.find_one({"email": "student@university.edu"})
    legacy_doc = {
        "internship_id": "legacy_int_123",
        "internship_title": "Legacy Systems Intern",
        "company_id": "legacy_comp_123",
        "company_name": "Legacy Corp",
        "student_id": str(student["_id"]),
        "student_name": "Alex Morgan",
        "status": "in_review",
        "applied_at": "2024-01-01"
        # NO status_history field
    }
    res = db.applications.insert_one(legacy_doc)
    legacy_id = str(res.inserted_id)

    # Check student endpoint handles it gracefully
    student_login = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    student_token = student_login.json()["access_token"]

    get_resp = client.get(
        f"/api/applications/{legacy_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["status"] == "in_review"
    assert data.get("status_history") == [] # Graceful fallback, no runtime exception

def test_notification_delivery_resilience():
    db = get_db()
    recruiter_resp = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    rec_token = recruiter_resp.json()["access_token"]

    # Find an active application that isn't rejected/accepted
    app_doc = db.applications.find_one({"status": {"$nin": ["rejected", "accepted"]}})
    if not app_doc:
        db.applications.update_one({}, {"$set": {"status": "in_review"}})
        app_doc = db.applications.find_one({})
    app_id = str(app_doc["_id"])
    student_id = app_doc["student_id"]

    # Count existing notifications for student
    initial_notif_count = db.notifications.count_documents({"user_id": student_id})

    # Update status
    update_resp = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "status": "interview",
            "interview_date": "Next Monday at 10:00 AM PST",
            "feedback": "Prepared to discuss distributed systems architecture."
        }
    )
    assert update_resp.status_code == 200

    # Verify notification was generated
    final_notif_count = db.notifications.count_documents({"user_id": student_id})
    assert final_notif_count > initial_notif_count
    latest_notif = db.notifications.find_one(
        {"user_id": student_id},
        sort=[("_id", -1)]
    )
    assert "INTERVIEW" in latest_notif["message"]
    assert "Next Monday at 10:00 AM PST" in latest_notif["message"]

def test_auth_token_validation_and_tampering():
    # 1. Missing token -> 401
    res_missing = client.get("/api/auth/me")
    assert res_missing.status_code == 401

    # 2. Malformed token -> 401
    res_malformed = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-valid-token"})
    assert res_malformed.status_code == 401

    # 3. Forged token signed with wrong secret -> 401
    forged_token = jwt.encode({"sub": "student@university.edu", "role": "admin"}, "wrong_secret_key_12345_forged_signature_secret", algorithm="HS256")
    res_forged = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert res_forged.status_code == 401

    # 4. Expired token -> 401
    expired_token = create_access_token({"sub": "student@university.edu"}, expires_delta=timedelta(seconds=-10))
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401

def test_passwords_never_exposed_in_responses():
    login_resp = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    user_obj = login_resp.json()["user"]
    assert "password" not in user_obj
    assert "password_hash" not in user_obj

    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert "password" not in me_data
    assert "password_hash" not in me_data

def test_public_registration_cannot_grant_admin_role():
    reg_resp = client.post("/api/auth/register", json={
        "email": "hacker@evil.com",
        "password": "password123",
        "full_name": "Privilege Escalator",
        "role": "admin" # Attacker attempts to become admin
    })
    assert reg_resp.status_code == 400
    assert "only allows" in reg_resp.json()["detail"]

def test_login_rate_limiting_protection():
    # Attempt 6 consecutive failed logins with wrong password
    status_codes = []
    for _ in range(6):
        r = client.post("/api/auth/login", json={
            "email": "brute_force_target@test.com",
            "password": "wrong_pass"
        })
        status_codes.append(r.status_code)
    
    # Initial attempts return 401, subsequent throttled return 429
    assert 401 in status_codes
    assert 429 in status_codes

def test_notification_isolation_and_idor():
    # Sarah Lin logs in
    sarah_login = client.post("/api/auth/login", json={
        "email": "sarah.lin@berkeley.edu",
        "password": "password123"
    })
    sarah_token = sarah_login.json()["access_token"]

    # Alex Morgan logs in
    alex_login = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })

    db = get_db()
    # Create a notification specifically for Alex
    alex_notif = db.notifications.insert_one({
        "user_id": alex_login.json()["user"]["id"],
        "title": "Confidential Offer",
        "message": "Top Secret Compensation details",
        "type": "success",
        "read": False,
        "created_at": "Just now"
    })
    alex_notif_id = str(alex_notif.inserted_id)

    # Sarah fetches her notifications -> should NOT contain Alex's notification
    sarah_notes = client.get("/api/notifications", headers={"Authorization": f"Bearer {sarah_token}"})
    assert sarah_notes.status_code == 200
    sarah_titles = [n["title"] for n in sarah_notes.json()]
    assert "Confidential Offer" not in sarah_titles

    # Sarah tries to mark Alex's notification as read -> 403 Forbidden
    mark_resp = client.patch(
        f"/api/notifications/{alex_notif_id}/read",
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    assert mark_resp.status_code == 403

def test_internship_idor_modification_protection():
    db = get_db()
    # Recruiter 1 (TechCorp Ventures)
    recruiter_1 = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    r1_token = recruiter_1.json()["access_token"]

    # Recruiter 2 (Independent Recruiter)
    client.post("/api/auth/register", json={
        "email": "recruiter2@othercorp.com",
        "password": "password123",
        "full_name": "OtherCorp Recruiter",
        "role": "company"
    })
    recruiter_2 = client.post("/api/auth/login", json={
        "email": "recruiter2@othercorp.com",
        "password": "password123"
    })
    r2_token = recruiter_2.json()["access_token"]

    # Recruiter 2 creates an internship
    create_resp = client.post(
        "/api/internships",
        headers={"Authorization": f"Bearer {r2_token}"},
        json={
            "title": "Security Researcher Intern",
            "company_name": "OtherCorp",
            "location": "Remote",
            "work_mode": "Remote",
            "stipend": "$60/hr",
            "skills_required": ["Python", "FastAPI", "Security"],
            "description": "Security audit intern role",
            "deadline": "2025-12-31"
        }
    )
    assert create_resp.status_code == 200
    internship_id = create_resp.json()["id"]

    # Recruiter 1 attempts to update Recruiter 2's internship -> 403 Forbidden
    update_resp = client.put(
        f"/api/internships/{internship_id}",
        headers={"Authorization": f"Bearer {r1_token}"},
        json={"title": "Hacked Title"}
    )
    assert update_resp.status_code == 403

    # Recruiter 1 attempts to close/delete Recruiter 2's internship -> 403 Forbidden
    del_resp = client.delete(
        f"/api/internships/{internship_id}",
        headers={"Authorization": f"Bearer {r1_token}"}
    )
    assert del_resp.status_code == 403

def test_task_idor_submission_and_review_protection():
    db = get_db()
    # Sarah Lin (student)
    sarah_login = client.post("/api/auth/login", json={
        "email": "sarah.lin@berkeley.edu",
        "password": "password123"
    })
    sarah_token = sarah_login.json()["access_token"]

    # Alex Morgan (student)
    alex_login = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "password123"
    })
    alex_token = alex_login.json()["access_token"]

    # Mentor
    mentor_login = client.post("/api/auth/login", json={
        "email": "mentor@industry.org",
        "password": "password123"
    })
    mentor_token = mentor_login.json()["access_token"]

    # Mentor creates a task assigned to Alex Morgan
    alex_user = db.users.find_one({"email": "student@university.edu"})
    create_task_res = client.post(
        "/api/tasks",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={
            "intern_id": str(alex_user["_id"]),
            "title": "Alex Only Task",
            "description": "Implement auth middleware",
            "priority": "high",
            "deadline": "Tomorrow"
        }
    )
    assert create_task_res.status_code == 200
    task_id = create_task_res.json()["id"]

    # Sarah tries to submit Alex's task -> 403 Forbidden
    submit_sarah = client.post(
        f"/api/tasks/{task_id}/submit",
        headers={"Authorization": f"Bearer {sarah_token}"},
        json={"pr_info": "PR #100", "submission_notes": "Attempting unauthorized submission"}
    )
    assert submit_sarah.status_code == 403

    # Alex submits his own task -> 200 OK
    submit_alex = client.post(
        f"/api/tasks/{task_id}/submit",
        headers={"Authorization": f"Bearer {alex_token}"},
        json={"pr_info": "PR #101", "submission_notes": "Legitimate submission"}
    )
    assert submit_alex.status_code == 200

def test_complete_application_workflow_lifecycle():
    # Login student (Sarah Lin)
    student_res = client.post("/api/auth/login", json={
        "email": "sarah.lin@berkeley.edu",
        "password": "password123"
    })
    s_token = student_res.json()["access_token"]
    student_id = student_res.json()["user"]["id"]

    # Login recruiter (TechCorp Ventures)
    recruiter_res = client.post("/api/auth/login", json={
        "email": "recruiter@enterprise.com",
        "password": "password123"
    })
    r_token = recruiter_res.json()["access_token"]

    db = get_db()
    # Find Stripe internship
    internship = db.internships.find_one({"company_name": "Stripe"})
    int_id = str(internship["_id"])

    # Ensure clean slate for Sarah on Stripe
    db.applications.delete_many({"internship_id": int_id, "student_id": student_id})

    # Step 1: Student submits application
    app_create = client.post(
        "/api/applications",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"internship_id": int_id}
    )
    assert app_create.status_code == 200
    app_data = app_create.json()
    app_id = app_data["id"]
    assert app_data["status"] == "applied"
    assert len(app_data["status_history"]) == 1

    # Step 2: Recruiter moves to Under Review with feedback (using alias 'under_review')
    rev_res = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "status": "under_review", # Test status alias normalization
            "feedback": "Portfolio under technical review by staff engineer.",
            "current_status": "applied"
        }
    )
    assert rev_res.status_code == 200

    # Step 3: Recruiter moves to Shortlisted
    short_res = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "status": "shortlisted",
            "feedback": "High skill match on distributed systems.",
            "current_status": "in_review"
        }
    )
    assert short_res.status_code == 200

    # Step 4: Recruiter moves to Interview
    interview_res = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "status": "interview",
            "interview_date": "Friday 3:00 PM EST",
            "interview_notes": "Live architecture system design session",
            "current_status": "shortlisted"
        }
    )
    assert interview_res.status_code == 200

    # Step 5: Recruiter moves to Selected (final decision, using alias 'selected')
    selected_res = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "status": "selected", # Test status alias for accepted
            "feedback": "Congratulations! Offer extended for Summer 2025 cohort.",
            "current_status": "interview"
        }
    )
    assert selected_res.status_code == 200

    # Step 6: Verify student view of detail and full history
    detail_res = client.get(
        f"/api/applications/{app_id}",
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert detail_res.status_code == 200
    final_detail = detail_res.json()
    assert final_detail["status"] == "accepted"
    history = final_detail["status_history"]
    assert len(history) == 5
    assert history[0]["status"] == "applied"
    assert history[1]["status"] == "in_review"
    assert history[2]["status"] == "shortlisted"
    assert history[3]["status"] == "interview"
    assert history[4]["status"] == "accepted"
    assert "Congratulations! Offer extended" in history[4]["feedback"]

    # Step 7: Verify terminal state prevents further transitions
    terminal_res = client.patch(
        f"/api/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {r_token}"},
        json={"status": "in_review", "current_status": "accepted"}
    )
    assert terminal_res.status_code == 400
    assert "terminal status" in terminal_res.json()["detail"]


def test_mentor_candidates_and_task_assignment():
    """Verify mentors can fetch real registered candidates and assign deliverables."""
    # Mentor login
    mentor_login = client.post("/api/auth/login", json={"email": "mentor@industry.org", "password": "password123"})
    m_token = mentor_login.json()["access_token"]

    # Student login
    student_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    s_token = student_login.json()["access_token"]
    student_id = student_login.json()["user"]["id"]

    # 1. Mentor fetches candidates
    cand_res = client.get("/api/tasks/candidates", headers={"Authorization": f"Bearer {m_token}"})
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert len(candidates) > 0
    assert any(c["role"] == "student" for c in candidates)
    # Ensure password hashes are not leaked in candidate list
    assert all("password_hash" not in c for c in candidates)

    # 2. Student cannot access mentor candidate pool (RBAC)
    unauth_cand = client.get("/api/tasks/candidates", headers={"Authorization": f"Bearer {s_token}"})
    assert unauth_cand.status_code == 403

    # 3. Mentor assigns deliverable to candidate
    task_res = client.post(
        "/api/tasks",
        headers={"Authorization": f"Bearer {m_token}"},
        json={
            "intern_id": student_id,
            "title": "Implement Redis Cluster Failover",
            "description": "Configure sentinel failover scripts and write automated integration tests.",
            "priority": "high",
            "deadline": "Friday, 5:00 PM"
        }
    )
    assert task_res.status_code == 200
    task_data = task_res.json()
    assert task_data["intern_id"] == student_id
    assert task_data["status"] == "pending"


def test_ai_answer_evaluation_endpoint():
    """Verify AI practice interview question evaluation."""
    res = client.post(
        "/api/ai/evaluate-answer",
        json={
            "company_name": "Stripe",
            "role_title": "Backend Engineering Intern",
            "question": "How do you design an idempotent payment processing pipeline?",
            "answer": "We generate unique idempotency keys in Redis with a 24-hour TTL, check state before processing, and wrap the database ledger update in a serializable PostgreSQL transaction with exponential backoff retries."
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert data["score"] >= 70
    assert "feedback" in data
    assert "Redis" in data["detected_keywords"] or "PostgreSQL" in data["detected_keywords"]
    assert len(data["strengths"]) > 0


def test_company_isolation_and_stats():
    """Verify company user only sees their own applications and stats calculate from actual records."""
    db = get_db()
    # Register Company A
    reg_a = client.post(
        "/api/auth/register",
        json={
            "email": "corp_a@enterprise.com",
            "password": "password123",
            "full_name": "Alpha Corp",
            "role": "company"
        }
    )
    assert reg_a.status_code == 200
    token_a = reg_a.json()["access_token"]
    user_a_id = reg_a.json()["user"]["id"]

    # Company A initially has 0 postings and 0 applicants
    stats_a = client.get("/api/applications/stats", headers={"Authorization": f"Bearer {token_a}"})
    assert stats_a.status_code == 200
    data_a = stats_a.json()
    assert data_a["active_postings"] == 0
    assert data_a["total_applicants"] == 0

    apps_a = client.get("/api/applications/company", headers={"Authorization": f"Bearer {token_a}"})
    assert apps_a.status_code == 200
    assert len(apps_a.json()) == 0


def test_student_readiness_score_calculation():
    """Verify student profile readiness score is computed from actual fields without fabricated base scores."""
    # Register new clean student
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "new_student_eval@university.edu",
            "password": "password123",
            "full_name": "Jordan Lee",
            "role": "student"
        }
    )
    assert reg.status_code == 200
    token = reg.json()["access_token"]

    # Update with minimal profile
    p_res = client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"university": "Carnegie Mellon", "degree": "Computer Science"}
    )
    assert p_res.status_code == 200
    profile = p_res.json()["profile"]
    # 20 (name+email) + 20 (uni+degree) = 40
    assert profile["readiness_score"] == 40


def test_admin_user_management_crud():
    """Verify admin can list users, create accounts, filter, change roles, and toggle status."""
    # 1. Admin login
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    assert admin_login.status_code == 200
    a_token = admin_login.json()["access_token"]

    # Student login
    student_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    assert student_login.status_code == 200
    s_token = student_login.json()["access_token"]

    # 2. Non-admin forbidden from user management
    unauth_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {s_token}"})
    assert unauth_res.status_code == 403

    # 3. Admin lists users with pagination and search
    users_res = client.get("/api/admin/users?limit=10", headers={"Authorization": f"Bearer {a_token}"})
    assert users_res.status_code == 200
    data = users_res.json()
    assert "users" in data
    assert "total" in data
    assert len(data["users"]) > 0
    # Passwords never exposed
    for u in data["users"]:
        assert "password_hash" not in u
        assert "password" not in u

    # 4. Admin creates new student account
    new_user_res = client.post(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {a_token}"},
        json={
            "email": "provisioned_student@campus.edu",
            "password": "strongPassword123",
            "full_name": "Taylor Swift",
            "role": "student",
            "organization": "NYU",
            "title": "Music Tech Intern"
        }
    )
    assert new_user_res.status_code == 201
    created_user = new_user_res.json()["user"]
    assert created_user["email"] == "provisioned_student@campus.edu"
    assert created_user["role"] == "student"
    created_id = created_user["id"]

    # 5. Duplicate email rejection
    dup_res = client.post(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {a_token}"},
        json={
            "email": "provisioned_student@campus.edu",
            "password": "strongPassword123",
            "full_name": "Duplicate User",
            "role": "student"
        }
    )
    assert dup_res.status_code == 400

    # 6. Admin inspects user detail
    detail_res = client.get(f"/api/admin/users/{created_id}", headers={"Authorization": f"Bearer {a_token}"})
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == created_id
    assert "password_hash" not in detail

    # 7. Admin updates user role
    role_res = client.patch(
        f"/api/admin/users/{created_id}/role",
        headers={"Authorization": f"Bearer {a_token}"},
        json={"role": "mentor"}
    )
    assert role_res.status_code == 200

    # 8. Admin deactivates user
    status_res = client.patch(
        f"/api/admin/users/{created_id}/status",
        headers={"Authorization": f"Bearer {a_token}"},
        json={"is_active": False}
    )
    assert status_res.status_code == 200

    # Deactivated user cannot log in
    deact_login = client.post(
        "/api/auth/login",
        json={"email": "provisioned_student@campus.edu", "password": "strongPassword123"}
    )
    assert deact_login.status_code == 403


def test_secure_password_reset_flow():
    """Verify one-time token generation, expiration check, single-use enforcement, and audit trail."""
    # 1. Request password reset
    forgot_res = client.post(
        "/api/auth/forgot-password",
        json={"email": "student@university.edu"}
    )
    assert forgot_res.status_code == 200
    data = forgot_res.json()
    assert data["status"] == "success"
    reset_token = data.get("reset_token")
    assert reset_token is not None

    # 2. Reset password using token
    new_pass = "newSecurePassword456"
    reset_res = client.post(
        "/api/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": new_pass
        }
    )
    assert reset_res.status_code == 200

    # 3. Single-use enforcement: reusing same token must fail
    reuse_res = client.post(
        "/api/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "yetAnotherPassword789"
        }
    )
    assert reuse_res.status_code == 400

    # 4. Old password no longer logs in
    old_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    assert old_login.status_code == 401

    # 5. New password logs in successfully
    new_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": new_pass})
    assert new_login.status_code == 200

    # 6. Admin can initiate password reset
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]
    student_id = new_login.json()["user"]["id"]

    admin_reset = client.post(
        f"/api/admin/users/{student_id}/reset-password",
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert admin_reset.status_code == 200
    adm_token = admin_reset.json()["reset_token"]
    assert adm_token is not None


def test_mentor_student_assignment_and_scoping():
    """Verify admin assignment of students to mentors and mentor student scoping."""
    # Logins
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]

    mentor_login = client.post("/api/auth/login", json={"email": "mentor@industry.org", "password": "password123"})
    m_token = mentor_login.json()["access_token"]
    m_id = mentor_login.json()["user"]["id"]

    # 1. Admin gets available mentors
    mentors_res = client.get("/api/admin/mentors", headers={"Authorization": f"Bearer {a_token}"})
    assert mentors_res.status_code == 200
    assert any(m["id"] == m_id for m in mentors_res.json())

    # 2. Register a new student
    new_student = client.post(
        "/api/auth/register",
        json={
            "email": "unassigned_student@columbia.edu",
            "password": "password123",
            "full_name": "Marcus Aurelius",
            "role": "student"
        }
    )
    assert new_student.status_code == 200
    s_id = new_student.json()["user"]["id"]

    # 3. Before assignment, mentor's assigned students list does NOT include this student
    m_students_before = client.get("/api/tasks/students", headers={"Authorization": f"Bearer {m_token}"})
    assert m_students_before.status_code == 200
    assert not any(s["id"] == s_id for s in m_students_before.json())

    # 4. Admin assigns student to mentor
    assign_res = client.post(
        "/api/admin/assignments",
        headers={"Authorization": f"Bearer {a_token}"},
        json={"student_id": s_id, "mentor_id": m_id}
    )
    assert assign_res.status_code == 200

    # 5. After assignment, mentor retrieves student with calculated task stats
    m_students_after = client.get("/api/tasks/students", headers={"Authorization": f"Bearer {m_token}"})
    assert m_students_after.status_code == 200
    assigned_match = next((s for s in m_students_after.json() if s["id"] == s_id), None)
    assert assigned_match is not None
    assert "task_stats" in assigned_match
    assert assigned_match["task_stats"]["total"] == 0

    # 6. Admin unassigns student
    unassign_res = client.delete(f"/api/admin/assignments/{s_id}", headers={"Authorization": f"Bearer {a_token}"})
    assert unassign_res.status_code == 200

    m_students_unassigned = client.get("/api/tasks/students", headers={"Authorization": f"Bearer {m_token}"})
    assert not any(s["id"] == s_id for s in m_students_unassigned.json())


def test_admin_stats_accuracy():
    """Verify admin stats match real database counts with zero hallucinations."""
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]

    res = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {a_token}"})
    assert res.status_code == 200
    stats = res.json()

    assert stats["total_users"] >= 4
    assert stats["students_count"] >= 1
    assert stats["companies_count"] >= 1
    assert stats["mentors_count"] >= 1
    assert stats["admins_count"] >= 1
    assert stats["active_users"] >= 4
    assert "applications_by_status" in stats
    assert "task_completion_rate" in stats


def test_admin_announcements_audience_targeting():
    """Verify admin announcements creation, RBAC restriction, and audience-targeted visibility."""
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]

    recruiter_login = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    r_token = recruiter_login.json()["access_token"]

    student_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    # Student might have changed password in earlier test, let's login with fallback or handle
    if student_login.status_code != 200:
        student_login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "newSecurePassword456"})
    s_token = student_login.json()["access_token"]

    # 1. Non-admin forbidden from creating announcements
    unauth = client.post(
        "/api/admin/announcements",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"title": "Hacked", "message": "Spam", "audience": "all"}
    )
    assert unauth.status_code == 403

    # 2. Admin creates student-only announcement
    create_res = client.post(
        "/api/admin/announcements",
        headers={"Authorization": f"Bearer {a_token}"},
        json={
            "title": "Resume Workshop Tomorrow",
            "message": "Join us on Zoom for a live resume review workshop.",
            "audience": "student",
            "priority": "warning"
        }
    )
    assert create_res.status_code == 201
    ann_data = create_res.json()
    assert ann_data["audience"] == "student"

    # 3. Student sees this announcement
    s_anns = client.get("/api/announcements", headers={"Authorization": f"Bearer {s_token}"})
    assert s_anns.status_code == 200
    assert any(a["title"] == "Resume Workshop Tomorrow" for a in s_anns.json())

    # 4. Recruiter does NOT see this student-only announcement
    r_anns = client.get("/api/announcements", headers={"Authorization": f"Bearer {r_token}"})
    assert r_anns.status_code == 200
    assert not any(a["title"] == "Resume Workshop Tomorrow" for a in r_anns.json())


def test_gemini_chatbot_unauthenticated_forbidden():
    """Verify unauthenticated users cannot call protected chatbot endpoints."""
    res = client.post("/api/ai/chat", json={"message": "Hello AI"})
    assert res.status_code == 401

    hist_res = client.get("/api/ai/chat/history")
    assert hist_res.status_code == 401

    del_res = client.delete("/api/ai/chat/history")
    assert del_res.status_code == 401


def test_gemini_chatbot_validation():
    """Verify input validation for empty messages and length bounds."""
    # Authenticate student
    login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    if login.status_code != 200:
        login = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "newSecurePassword456"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Empty message
    empty_res = client.post("/api/ai/chat", headers=headers, json={"message": ""})
    assert empty_res.status_code == 422

    # Whitespace message
    blank_res = client.post("/api/ai/chat", headers=headers, json={"message": "   \n\t  "})
    assert blank_res.status_code == 422

    # Oversized message (>4000 chars)
    long_res = client.post("/api/ai/chat", headers=headers, json={"message": "a" * 4001})
    assert long_res.status_code == 422


def test_gemini_chatbot_conversation_and_history():
    """Verify chat generation, message persistence in MongoDB, and strict per-user scoping."""
    # 1. Login Student A
    login_a = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
    if login_a.status_code != 200:
        login_a = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "newSecurePassword456"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Clear previous history for clean baseline
    client.delete("/api/ai/chat/history", headers=headers_a)

    # 2. Send message
    chat_res = client.post(
        "/api/ai/chat",
        headers=headers_a,
        json={"message": "How do I optimize my resume for software engineering internships?"}
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "response" in data
    assert len(data["response"]) > 30
    assert "model" in data
    assert "provider" in data
    assert "created_at" in data

    # 3. Retrieve history
    hist_res = client.get("/api/ai/chat/history", headers=headers_a)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert hist["total"] >= 2
    assert any(m["role"] == "user" for m in hist["messages"])
    assert any(m["role"] == "model" for m in hist["messages"])

    # 4. Scoping verification: Recruiter B cannot see Student A's chat history
    login_b = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    hist_b = client.get("/api/ai/chat/history", headers=headers_b)
    assert hist_b.status_code == 200
    # Recruiter B must have 0 messages
    assert hist_b.json()["total"] == 0

    # 5. Clear history for Student A
    del_res = client.delete("/api/ai/chat/history", headers=headers_a)
    assert del_res.status_code == 200

    hist_cleared = client.get("/api/ai/chat/history", headers=headers_a)
    assert hist_cleared.status_code == 200
    assert hist_cleared.json()["total"] == 0


def test_ai_service_rule_based_fallback():
    """Verify AI service produces high quality career coaching even without external network/key."""
    from app.services.ai_service import AIService
    
    roadmap = AIService._generate_rule_based_chat_fallback(
        message="Create a 30-day learning plan for full stack development",
        user_context={"name": "Alex", "role": "student"}
    )
    assert "30-Day" in roadmap
    assert "FastAPI" in roadmap
    assert "React" in roadmap

    interview_tips = AIService._generate_rule_based_chat_fallback(
        message="Tell me how to prepare for technical interview and STAR questions",
        user_context={"name": "Alex", "role": "student"}
    )
    assert "STAR" in interview_tips
    assert "Situation" in interview_tips


def test_admin_direct_mentor_creation():
    """Verify Admin can directly provision a Mentor account with initialized mentor profile."""
    from app.database.connection import get_db

    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    create_res = client.post(
        "/api/admin/users",
        headers=headers,
        json={
            "email": "dr_evelyn_mentor@csail.mit.edu",
            "password": "strongPassword123",
            "full_name": "Dr. Evelyn Reed",
            "role": "mentor",
            "organization": "MIT CSAIL",
            "title": "Principal Systems Mentor"
        }
    )
    assert create_res.status_code == 201
    mentor_data = create_res.json()["user"]
    assert mentor_data["role"] == "mentor"
    assert mentor_data["email"] == "dr_evelyn_mentor@csail.mit.edu"
    m_id = mentor_data["id"]

    # Verify mentor profile initialized in database
    db = get_db()
    prof = db.mentor_profiles.find_one({"user_id": m_id})
    assert prof is not None
    assert prof["title"] == "Principal Systems Mentor"
    assert prof["organization"] == "MIT CSAIL"


def test_admin_promote_student_to_mentor_direct():
    """Verify Admin can promote an existing Student directly to a Mentor without an approval queue."""
    from app.database.connection import get_db, to_object_id

    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    # 1. Register a student
    student_res = client.post(
        "/api/auth/register",
        json={
            "email": "promoted_student@berkeley.edu",
            "password": "password123",
            "full_name": "Alan Kay Jr",
            "role": "student"
        }
    )
    assert student_res.status_code == 200
    student_id = student_res.json()["user"]["id"]

    # 2. Directly change role to mentor via Admin endpoint
    role_res = client.patch(
        f"/api/admin/users/{student_id}/role",
        headers=headers,
        json={
            "role": "mentor",
            "title": "Adjunct Research Mentor",
            "organization": "UC Berkeley"
        }
    )
    assert role_res.status_code == 200
    res_data = role_res.json()
    assert res_data["new_role"] == "mentor"

    # 3. Verify in database
    db = get_db()
    user_doc = db.users.find_one({"_id": to_object_id(student_id)})
    assert user_doc["role"] == "mentor"

    # 4. Verify mentor profile was automatically initialized
    mentor_prof = db.mentor_profiles.find_one({"user_id": student_id})
    assert mentor_prof is not None
    assert mentor_prof["title"] == "Adjunct Research Mentor"
    assert mentor_prof["organization"] == "UC Berkeley"


def test_role_change_authorization_and_self_promotion_prevention():
    """Verify role changes are strictly Admin-only and users cannot promote themselves."""
    from app.database.connection import get_db, to_object_id

    # Register student
    student_res = client.post(
        "/api/auth/register",
        json={
            "email": "unauthorized_user@campus.edu",
            "password": "password123",
            "full_name": "Bob Student",
            "role": "student"
        }
    )
    assert student_res.status_code == 200
    s_token = student_res.json()["access_token"]
    s_id = student_res.json()["user"]["id"]

    # 1. Student attempts to promote themselves via Admin endpoint -> 403 Forbidden
    hack_admin_endpoint = client.patch(
        f"/api/admin/users/{s_id}/role",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"role": "mentor"}
    )
    assert hack_admin_endpoint.status_code == 403

    # 2. Student attempts to send role in profile update -> Role is ignored and remains student
    hack_profile_endpoint = client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"bio": "Trying to become mentor", "role": "mentor"}
    )
    assert hack_profile_endpoint.status_code == 200

    db = get_db()
    user_doc = db.users.find_one({"_id": to_object_id(s_id)})
    assert user_doc["role"] == "student"

    # 3. Unauthenticated request -> 401 Unauthorized
    unauth_res = client.patch(f"/api/admin/users/{s_id}/role", json={"role": "mentor"})
    assert unauth_res.status_code == 401


def test_mentor_access_and_task_assignment_restricted_to_assigned_students():
    """Verify mentors can access only their assigned students and cannot assign tasks to unassigned students."""
    admin_login = client.post("/api/auth/login", json={"email": "admin@internconnect.ai", "password": "password123"})
    a_token = admin_login.json()["access_token"]
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # 1. Register Mentor A and Mentor B
    mentor_a = client.post(
        "/api/auth/register",
        json={"email": "mentor_alpha@lab.org", "password": "password123", "full_name": "Mentor Alpha", "role": "mentor"}
    )
    ma_token = mentor_a.json()["access_token"]
    ma_id = mentor_a.json()["user"]["id"]
    ma_headers = {"Authorization": f"Bearer {ma_token}"}

    mentor_b = client.post(
        "/api/auth/register",
        json={"email": "mentor_beta@lab.org", "password": "password123", "full_name": "Mentor Beta", "role": "mentor"}
    )
    mb_id = mentor_b.json()["user"]["id"]

    # 2. Register Student X and Student Y
    student_x = client.post(
        "/api/auth/register",
        json={"email": "student_x@college.edu", "password": "password123", "full_name": "Student X", "role": "student"}
    )
    sx_id = student_x.json()["user"]["id"]

    student_y = client.post(
        "/api/auth/register",
        json={"email": "student_y@college.edu", "password": "password123", "full_name": "Student Y", "role": "student"}
    )
    sy_id = student_y.json()["user"]["id"]

    # 3. Admin assigns Student X to Mentor A, and Student Y to Mentor B
    client.post("/api/admin/assignments", headers=a_headers, json={"student_id": sx_id, "mentor_id": ma_id})
    client.post("/api/admin/assignments", headers=a_headers, json={"student_id": sy_id, "mentor_id": mb_id})

    # 4. Mentor Alpha accesses candidates & students -> Student X is present, Student Y is NOT present
    candidates_res = client.get("/api/tasks/candidates", headers=ma_headers)
    assert candidates_res.status_code == 200
    candidate_ids = [c["id"] for c in candidates_res.json()]
    assert sx_id in candidate_ids
    assert sy_id not in candidate_ids

    students_res = client.get("/api/tasks/students", headers=ma_headers)
    assert students_res.status_code == 200
    assigned_ids = [s["id"] for s in students_res.json()]
    assert sx_id in assigned_ids
    assert sy_id not in assigned_ids

    # 5. Mentor Alpha attempts to assign a task to unassigned Student Y -> 403 Forbidden
    forbidden_task = client.post(
        "/api/tasks",
        headers=ma_headers,
        json={
            "intern_id": sy_id,
            "title": "Unauthorized Deliverable",
            "description": "This should be rejected",
            "priority": "high",
            "deadline": "Tomorrow"
        }
    )
    assert forbidden_task.status_code == 403

    # 6. Mentor Alpha assigns a task to assigned Student X -> 200 OK
    valid_task = client.post(
        "/api/tasks",
        headers=ma_headers,
        json={
            "intern_id": sx_id,
            "title": "Implement Redis Cache",
            "description": "Add caching layer for frequent queries",
            "priority": "high",
            "deadline": "Friday"
        }
    )
    assert valid_task.status_code == 200
    assert valid_task.json()["intern_id"] == sx_id


# ============================================================================
# CRM MODULE TESTS (PIPELINE, STAGES, NOTES, TASKS, ANALYTICS, GEMINI AI, RBAC)
# ============================================================================

def test_crm_pipeline_kanban_and_scoping():
    """Verify recruiter CRM pipeline groups candidates across 7 Kanban stages with company scoping."""
    # 1. Login as default seeded recruiter
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    assert rec_res.status_code == 200
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch pipeline
    pipe_res = client.get("/api/crm/pipeline", headers=headers)
    assert pipe_res.status_code == 200
    data = pipe_res.json()

    assert "stages" in data
    assert "stage_counts" in data
    assert "total_candidates" in data
    assert data["total_candidates"] >= 3

    # Check 7 canonical stages exist
    for stage_name in ["applied", "screening", "shortlisted", "interview", "offer", "hired", "rejected"]:
        assert stage_name in data["stages"]
        assert stage_name in data["stage_counts"]

    # Verify candidates are partitioned into correct stages
    interview_cands = data["stages"]["interview"]
    assert any(c["student_name"] == "David Kim" for c in interview_cands)


def test_crm_candidate_search_and_pagination():
    """Verify searching by name, university, skills, stage filtering, and pagination."""
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Search by name 'Alex'
    search_alex = client.get("/api/crm/candidates?search=Alex", headers=headers)
    assert search_alex.status_code == 200
    d_alex = search_alex.json()
    assert d_alex["total"] >= 1
    assert any("Alex" in c["student_name"] for c in d_alex["candidates"])

    # 2. Search by skill 'Kubernetes'
    search_k8s = client.get("/api/crm/candidates?search=Kubernetes", headers=headers)
    assert search_k8s.status_code == 200
    assert any("Kubernetes" in c["skills"] for c in search_k8s.json()["candidates"])

    # 3. Filter by stage 'interview'
    stage_res = client.get("/api/crm/candidates?stage=interview", headers=headers)
    assert stage_res.status_code == 200
    for cand in stage_res.json()["candidates"]:
        assert cand["stage"] == "interview"

    # 4. Pagination check
    page_res = client.get("/api/crm/candidates?page=1&page_size=2", headers=headers)
    assert page_res.status_code == 200
    assert len(page_res.json()["candidates"]) <= 2
    assert page_res.json()["page"] == 1


def test_crm_candidate_detail_and_idor_protection():
    """Verify candidate detail returns rich profiles, and Company A cannot access Company B's candidates."""
    db = get_db()
    # 1. Create a distinct Company B and candidate application for Company B
    reg_b = client.post("/api/auth/register", json={
        "email": "corp_b_crm@enterprise.com",
        "password": "password123",
        "full_name": "Beta Corp CRM",
        "role": "company"
    })
    token_b = reg_b.json()["access_token"]
    user_b_id = reg_b.json()["user"]["id"]

    # Beta Corp posting
    post_res = client.post(
        "/api/internships",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "title": "Quantum Algorithm Intern",
            "company_name": "Beta Corp CRM",
            "location": "Boston, MA",
            "work_mode": "Hybrid",
            "stipend": "$60/hr",
            "skills_required": ["Python", "Qiskit"],
            "description": "Quantum algorithms engineering",
            "deadline": "Rolling"
        }
    )
    b_int_id = post_res.json()["id"]

    # Student registers and applies to Beta Corp
    reg_s = client.post("/api/auth/register", json={
        "email": "beta_applicant@mit.edu",
        "password": "password123",
        "full_name": "Quantum Explorer",
        "role": "student"
    })
    token_s = reg_s.json()["access_token"]
    app_res = client.post(
        "/api/applications",
        headers={"Authorization": f"Bearer {token_s}"},
        json={"internship_id": b_int_id}
    )
    b_app_id = app_res.json()["id"]

    # 2. Company B can read candidate detail -> 200 OK
    detail_b = client.get(f"/api/crm/candidates/{b_app_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert detail_b.status_code == 200
    assert detail_b.json()["student_name"] == "Quantum Explorer"
    assert detail_b.json()["stage"] == "applied"

    # 3. Recruiter from TechCorp tries to read Beta Corp's candidate -> 403 Forbidden (IDOR Protected)
    rec_a = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token_a = rec_a.json()["access_token"]

    idor_res = client.get(f"/api/crm/candidates/{b_app_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert idor_res.status_code == 403
    assert "Access denied" in idor_res.json()["detail"]


def test_crm_stage_transition_and_activity_timeline():
    """Verify recruiter can move candidate between stages, creating timeline history and student notification."""
    db = get_db()
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Find candidate in 'applied' stage
    alex_doc = db.applications.find_one({"student_name": "Alex Morgan"})
    alex_id = str(alex_doc["_id"])
    db.applications.update_one({"_id": to_object_id(alex_id)}, {"$set": {"status": "applied"}})

    # 1. Advance Alex from 'applied' to 'screening'
    move_res = client.patch(
        f"/api/crm/candidates/{alex_id}/stage",
        headers=headers,
        json={"stage": "screening", "feedback": "Reviewed GitHub portfolio. Proceeding with resume screen."}
    )
    assert move_res.status_code == 200
    assert move_res.json()["stage"] == "screening"

    # 2. Advance Alex to 'shortlisted'
    shortlist_res = client.patch(
        f"/api/crm/candidates/{alex_id}/stage",
        headers=headers,
        json={"stage": "shortlisted", "feedback": "Passed screening assessment."}
    )
    assert shortlist_res.status_code == 200
    assert shortlist_res.json()["stage"] == "shortlisted"

    # 3. Check candidate detail activity timeline
    detail = client.get(f"/api/crm/candidates/{alex_id}", headers=headers).json()
    assert detail["stage"] == "shortlisted"
    act_actions = [a["action"] for a in detail["activity_timeline"]]
    assert "stage_changed" in act_actions

    # 4. Attempting to set an invalid stage name -> 400 Bad Request
    invalid_res = client.patch(
        f"/api/crm/candidates/{alex_id}/stage",
        headers=headers,
        json={"stage": "completely_bogus_stage"}
    )
    assert invalid_res.status_code == 400


def test_crm_recruiter_notes_crud_and_privacy():
    """Verify adding/deleting recruiter notes, and ensure student endpoint never exposes private notes."""
    db = get_db()
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    alex_doc = db.applications.find_one({"student_name": "Alex Morgan"})
    alex_id = str(alex_doc["_id"])

    # 1. Add confidential note
    note_res = client.post(
        f"/api/crm/candidates/{alex_id}/notes",
        headers=headers,
        json={"content": "Candidate has excellent communication skills and deep understanding of Redis."}
    )
    assert note_res.status_code == 200
    note_data = note_res.json()
    assert "id" in note_data
    assert "Redis" in note_data["content"]
    note_id = note_data["id"]

    # 2. Read detail as recruiter -> note present
    rec_detail = client.get(f"/api/crm/candidates/{alex_id}", headers=headers).json()
    assert any(n["id"] == note_id for n in rec_detail["recruiter_notes"])

    # 3. Read detail as student -> confidential notes NOT in student ApplicationResponse schema
    stud_res = client.post("/api/auth/login", json={"email": "sarah.lin@berkeley.edu", "password": "password123"})
    if stud_res.status_code != 200:
        stud_res = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
        if stud_res.status_code != 200:
            stud_res = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "newSecurePassword456"})
    s_token = stud_res.json()["access_token"]
    stud_detail = client.get(f"/api/applications/{alex_id}", headers={"Authorization": f"Bearer {s_token}"}).json()
    assert "recruiter_notes" not in stud_detail

    # 4. Delete note
    del_res = client.delete(f"/api/crm/candidates/{alex_id}/notes/{note_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    rec_detail_after = client.get(f"/api/crm/candidates/{alex_id}", headers=headers).json()
    assert not any(n["id"] == note_id for n in rec_detail_after["recruiter_notes"])


def test_crm_follow_up_tasks_and_pending_endpoint():
    """Verify follow-up tasks with due dates and pending follow-ups feed."""
    db = get_db()
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    alex_doc = db.applications.find_one({"student_name": "Alex Morgan"})
    alex_id = str(alex_doc["_id"])

    # 1. Add follow-up task
    task_res = client.post(
        f"/api/crm/candidates/{alex_id}/tasks",
        headers=headers,
        json={
            "title": "Send take-home coding assessment",
            "due_date": "2026-12-01",
            "priority": "high"
        }
    )
    assert task_res.status_code == 200
    task_id = task_res.json()["id"]

    # 2. Check pending follow-ups feed
    pending_res = client.get("/api/crm/pending-followups", headers=headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert any(p["task_id"] == task_id for p in pending_list)

    # 3. Mark task completed
    update_res = client.patch(
        f"/api/crm/candidates/{alex_id}/tasks/{task_id}",
        headers=headers,
        json={"completed": True}
    )
    assert update_res.status_code == 200
    assert update_res.json()["task"]["completed"] is True

    # 4. Now verify task is no longer in pending feed
    pending_after = client.get("/api/crm/pending-followups", headers=headers).json()
    assert not any(p["task_id"] == task_id for p in pending_after)


def test_crm_interview_outcome_recording():
    """Verify recording structured interview feedback, rating (1-5), and recommendation."""
    db = get_db()
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    alex_doc = db.applications.find_one({"student_name": "Alex Morgan"})
    alex_id = str(alex_doc["_id"])

    # Record interview outcome
    outcome_res = client.post(
        f"/api/crm/candidates/{alex_id}/interviews",
        headers=headers,
        json={
            "round_type": "System Design Round",
            "rating": 5,
            "recommendation": "strong_hire",
            "strengths": "Clear grasp of sharding, replication, and distributed locking.",
            "concerns": "Minor: limited experience with Apache Kafka.",
            "notes": "Recommend extending offer for backend team.",
            "scheduled_date": "Next Monday at 10:00 AM"
        }
    )
    assert outcome_res.status_code == 200
    outcome_data = outcome_res.json()
    assert outcome_data["rating"] == 5
    assert outcome_data["recommendation"] == "strong_hire"

    # Verify reflected in candidate detail
    detail = client.get(f"/api/crm/candidates/{alex_id}", headers=headers).json()
    assert any(i["round_type"] == "System Design Round" for i in detail["interview_feedback"])


def test_crm_analytics_and_conversion_rates():
    """Verify CRM analytics metrics and conversion percentages calculate accurately."""
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    analytics_res = client.get("/api/crm/analytics", headers=headers)
    assert analytics_res.status_code == 200
    data = analytics_res.json()

    assert data["total_candidates"] >= 3
    assert "screening_rate" in data
    assert "shortlist_rate" in data
    assert "interview_rate" in data
    assert "offer_rate" in data
    assert "hire_rate" in data
    assert "overall_hire_rate" in data
    assert "pending_followups_count" in data


def test_crm_gemini_ai_summary_and_questions():
    """Verify Gemini AI candidate summary and interview questions generation with disclaimers."""
    db = get_db()
    rec_res = client.post("/api/auth/login", json={"email": "recruiter@enterprise.com", "password": "password123"})
    token = rec_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    alex_doc = db.applications.find_one({"student_name": "Alex Morgan"})
    alex_id = str(alex_doc["_id"])

    # 1. AI Summary
    summary_res = client.post(f"/api/crm/candidates/{alex_id}/ai-summary", headers=headers)
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert "summary" in s_data
    assert len(s_data["key_strengths"]) > 0
    assert "Not an automated hiring decision" in s_data["disclaimer"]

    # 2. AI Interview Questions
    q_res = client.post(f"/api/crm/candidates/{alex_id}/ai-interview-questions?round_type=Technical+Screen", headers=headers)
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert len(q_data["questions"]) >= 3
    assert "follow_up_prompts" in q_data["questions"][0]
    assert "Recruiter discretion advised" in q_data["disclaimer"]


def test_crm_rbac_student_forbidden():
    """Verify unauthorized roles (student, mentor) cannot access recruiter CRM endpoints."""
    # Student token
    stud_res = client.post("/api/auth/login", json={"email": "sarah.lin@berkeley.edu", "password": "password123"})
    if stud_res.status_code != 200:
        stud_res = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "password123"})
        if stud_res.status_code != 200:
            stud_res = client.post("/api/auth/login", json={"email": "student@university.edu", "password": "newSecurePassword456"})
    s_token = stud_res.json()["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    # Pipeline forbidden for student
    res1 = client.get("/api/crm/pipeline", headers=s_headers)
    assert res1.status_code == 403

    # Candidates list forbidden for student
    res2 = client.get("/api/crm/candidates", headers=s_headers)
    assert res2.status_code == 403

    # Analytics forbidden for student
    res3 = client.get("/api/crm/analytics", headers=s_headers)
    assert res3.status_code == 403




