import logging
from datetime import datetime, timezone
from app.core.security import hash_password
from app.database.connection import to_object_id

logger = logging.getLogger("internconnect.seed")

def seed_database(db):
    """Seed the database with initial realistic users and portal records matching sample.html."""
    try:
        # Ensure unique email index on users collection safely
        try:
            db.users.create_index("email", unique=True, sparse=True)
        except Exception as idx_err:
            logger.debug(f"Index creation notice: {idx_err}")

        users_count = db.users.count_documents({})
        if users_count > 0:
            logger.info("Database already initialized. Skipping seed.")
            return

        logger.info("Seeding database with initial users, internships, applications, and portal telemetry...")
        
        now_str = datetime.now(timezone.utc).isoformat()
        default_pw = hash_password("password123")

        # 1. USERS
        users_data = [
            {
                "email": "student@university.edu",
                "password_hash": default_pw,
                "role": "student",
                "full_name": "Alex Morgan",
                "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBsppvqA6f-QDa5NV1QkujTDcJp6ma6Wv_pLCmcBfzSeZ-oWgt9IVCrsaS6IsaFzQ_rHqqwUodE17a1bEdUWlLil_jHGGo3x623gWuI6uNKhsiN9pQAZumr3C91PHBC3s9EE9mjYpc1-HvHavhK7LoGM60ZLEkOWSeMcvXSOmR6R9wJ6kfPi7fYZRFvhmms5c_Vsmj8IuyS1olGJF8-1keOR2M4wiRS6pDxL6HLTE6MgyvxzpyF-BqeXg",
                "is_active": True,
                "created_at": now_str,
            },
            {
                "email": "recruiter@enterprise.com",
                "password_hash": default_pw,
                "role": "company",
                "full_name": "TechCorp Ventures",
                "avatar_url": "",
                "is_active": True,
                "created_at": now_str,
            },
            {
                "email": "mentor@industry.org",
                "password_hash": default_pw,
                "role": "mentor",
                "full_name": "Dr. Elena Vance",
                "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBTMOAEiKgyjCPbHJAY0ZY019jpNOAiyMdB1MISkGLw-OI-p-YAE9RCNf-9ETBkEcawKKKoJhNggnLmRshcBtVZQXOs8VDA0LmsvSsTXulaxkH5N1ie0UMv5p9z0Vg_XKIBvOiWT5moM69Og_d32bamEvIxOpdRoyJy-2WiGCsYKzjngjPfNY0jcB_SgmIEHrbbO2jqEZB5TvJk1VftdBeClgpClHpRmXKHVcgeY8JmtcK0z5-2yzsdhg",
                "is_active": True,
                "created_at": now_str,
            },
            {
                "email": "admin@internconnect.ai",
                "password_hash": default_pw,
                "role": "admin",
                "full_name": "Platform SuperAdmin",
                "avatar_url": "",
                "is_active": True,
                "created_at": now_str,
            },
            # Additional Candidate Users
            {
                "email": "sarah.lin@berkeley.edu",
                "password_hash": default_pw,
                "role": "student",
                "full_name": "Sarah Lin",
                "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuDTKSCIejfCMnsu2lbHTSWb1d9Qn65FqwZdUbFyR1lhMeutIBwMWfiBBbxP3Whii45FN7igaf2gWPG7GOoRY07PmpWpo6snuOGjR9qCjb-AwnC3NUCX1IeHiem0Ku-ErDywd_Cfk_DwqKJm8GkNK1Jhh5bAAe1YB1y7M-QNMx8xAI-HVno0RYAy0gF4b0FZDmMYDXB86dl8JJhnrSGssDjLU0EgbfUWm5UPxhEE5n9lyFYNWwfj0mw3BA",
                "is_active": True,
                "created_at": now_str,
            },
            {
                "email": "david.kim@mit.edu",
                "password_hash": default_pw,
                "role": "student",
                "full_name": "David Kim",
                "avatar_url": "",
                "is_active": True,
                "created_at": now_str,
            }
        ]

        inserted_users = {}
        for u in users_data:
            res = db.users.insert_one(u)
            inserted_users[u["email"]] = str(res.inserted_id)

        # Seed initial mentor-student relationship for testing and demo consistency
        mentor_id = inserted_users.get("mentor@industry.org")
        admin_id = inserted_users.get("admin@internconnect.ai", "admin")
        if mentor_id:
            db.users.update_one(
                {"_id": to_object_id(inserted_users["student@university.edu"])},
                {"$set": {
                    "assigned_mentor_id": mentor_id,
                    "assigned_mentor_name": "Dr. Elena Vance",
                    "assigned_at": now_str
                }}
            )
            db.users.update_one(
                {"_id": to_object_id(inserted_users["sarah.lin@berkeley.edu"])},
                {"$set": {
                    "assigned_mentor_id": mentor_id,
                    "assigned_mentor_name": "Dr. Elena Vance",
                    "assigned_at": now_str
                }}
            )
            db.mentor_assignments.insert_many([
                {
                    "student_id": inserted_users["student@university.edu"],
                    "student_name": "Alex Morgan",
                    "mentor_id": mentor_id,
                    "mentor_name": "Dr. Elena Vance",
                    "assigned_by": admin_id,
                    "assigned_at": now_str
                },
                {
                    "student_id": inserted_users["sarah.lin@berkeley.edu"],
                    "student_name": "Sarah Lin",
                    "mentor_id": mentor_id,
                    "mentor_name": "Dr. Elena Vance",
                    "assigned_by": admin_id,
                    "assigned_at": now_str
                }
            ])

        # 2. PROFILES
        # Student Profile for Alex Morgan
        db.student_profiles.insert_one({
            "user_id": inserted_users["student@university.edu"],
            "university": "Stanford University",
            "degree": "Computer Science & AI",
            "grad_year": "CS '26",
            "readiness_score": 85,
            "portfolio_url": "https://alexmorgan.dev",
            "github_url": "https://github.com/alexmorgan",
            "skills": ["React", "Node.js", "TypeScript", "Next.js", "Python", "SQL", "FastAPI"],
            "resume_text": "Alex Morgan. Stanford University Computer Science '26. Experience building high-throughput React frontends, Node.js microservices, and distributed API systems with Redis and PostgreSQL.",
        })

        # Company Profile for TechCorp
        db.company_profiles.insert_one({
            "user_id": inserted_users["recruiter@enterprise.com"],
            "company_name": "TechCorp Ventures",
            "industry": "Enterprise Cloud & AI",
            "tier": "Enterprise Hub",
            "verification_status": "verified",
            "logo_initial": "TC",
            "active_roles_count": 4
        })

        # Mentor Profile for Dr. Elena Vance
        db.mentor_profiles.insert_one({
            "user_id": inserted_users["mentor@industry.org"],
            "title": "Senior Engineering Mentor",
            "organization": "Stanford & Tech Industry Guild",
            "specialties": ["Distributed Systems", "Cloud Architecture", "Backend Engineering"],
            "capacity": 8,
            "active_mentees": 6
        })

        # 3. INTERNSHIPS
        internships_data = [
            {
                "company_name": "Stripe",
                "company_initial": "S",
                "title": "Software Engineering Intern",
                "location": "San Francisco, CA / Hybrid",
                "work_mode": "Hybrid",
                "stipend": "$58/hr + Housing",
                "stipend_numeric": 58.0,
                "duration": "12 Weeks (Summer 2025)",
                "skills_required": ["React", "TypeScript", "Distributed Systems", "SQL"],
                "description": "Build high-reliability financial infrastructure and modern customer portals processing billions in worldwide transactions.",
                "deadline": "Applications close in 4 days",
                "category": "Software Eng",
                "status": "active",
                "posted_at": now_str,
                "ai_match_percentage": 98,
                "ai_match_reason": "Matches your advanced React experience & concurrency coursework."
            },
            {
                "company_name": "Datadog",
                "company_initial": "DD",
                "title": "Observability & Cloud Platform Intern",
                "location": "New York, NY / Remote",
                "work_mode": "Remote",
                "stipend": "$52/hr + Relocation",
                "stipend_numeric": 52.0,
                "duration": "12 Weeks (Summer 2025)",
                "skills_required": ["Go", "Kubernetes", "Linux", "Docker"],
                "description": "Engineer real-time telemetry pipelines, container health monitoring, and distributed tracing at scale.",
                "deadline": "May 30, 2025",
                "category": "Software Eng",
                "status": "active",
                "posted_at": now_str,
                "ai_match_percentage": 92,
                "ai_match_reason": "High telemetry affinity. Complements backend skills."
            },
            {
                "company_name": "Figma",
                "company_initial": "F",
                "title": "Product Engineering & Systems Intern",
                "location": "San Francisco, CA / Remote",
                "work_mode": "Remote",
                "stipend": "$54/hr + Tech Stipend",
                "stipend_numeric": 54.0,
                "duration": "12 Weeks (Summer 2025)",
                "skills_required": ["TypeScript", "WebGL", "Rust", "React"],
                "description": "Shape the future of collaborative design tools with high-performance WebGL graphics rendering engines.",
                "deadline": "June 15, 2025",
                "category": "Software Eng",
                "status": "active",
                "posted_at": now_str,
                "ai_match_percentage": 89,
                "ai_match_reason": "Strong frontend layout and modern component architecture affinity."
            },
            {
                "company_name": "Notion",
                "company_initial": "N",
                "title": "AI Workspace Infrastructure Intern",
                "location": "San Francisco, CA / Remote",
                "work_mode": "Remote",
                "stipend": "$50/hr + Equipment",
                "stipend_numeric": 50.0,
                "duration": "10 Weeks (Summer 2025)",
                "skills_required": ["Python", "FastAPI", "Vector DBs", "PyTorch"],
                "description": "Help millions think faster with embedded AI agents, knowledge graphs, and hybrid semantic retrieval.",
                "deadline": "Rolling Admissions",
                "category": "AI & ML",
                "status": "active",
                "posted_at": now_str,
                "ai_match_percentage": 95,
                "ai_match_reason": "Top 5% alignment with your AI coursework and Python stack."
            },
            {
                "company_name": "Snowflake",
                "company_initial": "SF",
                "title": "Cloud Database Engine Intern",
                "location": "San Mateo, CA / Hybrid",
                "work_mode": "Hybrid",
                "stipend": "$60/hr + Housing",
                "stipend_numeric": 60.0,
                "duration": "12 Weeks (Summer 2025)",
                "skills_required": ["C++", "Distributed Databases", "SQL", "Linux"],
                "description": "Optimize multi-tenant query execution engines and vectorized analytical data processing.",
                "deadline": "Rolling Admissions",
                "category": "Software Eng",
                "status": "active",
                "posted_at": now_str,
                "ai_match_percentage": 87,
                "ai_match_reason": "Solid systems fundamentals; missing C++ runtime optimization."
            }
        ]

        inserted_internships = {}
        for item in internships_data:
            res = db.internships.insert_one(item)
            inserted_internships[item["company_name"]] = str(res.inserted_id)

        # 4. APPLICATIONS
        applications_data = [
            {
                "internship_id": inserted_internships["Stripe"],
                "internship_title": "Software Engineering Intern",
                "company_name": "Stripe",
                "student_id": inserted_users["student@university.edu"],
                "student_name": "Alex Morgan",
                "student_university": "Stanford University",
                "student_degree": "B.S. Software Engineering",
                "student_avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuBsppvqA6f-QDa5NV1QkujTDcJp6ma6Wv_pLCmcBfzSeZ-oWgt9IVCrsaS6IsaFzQ_rHqqwUodE17a1bEdUWlLil_jHGGo3x623gWuI6uNKhsiN9pQAZumr3C91PHBC3s9EE9mjYpc1-HvHavhK7LoGM60ZLEkOWSeMcvXSOmR6R9wJ6kfPi7fYZRFvhmms5c_Vsmj8IuyS1olGJF8-1keOR2M4wiRS6pDxL6HLTE6MgyvxzpyF-BqeXg",
                "skills": ["React", "Node.js", "TypeScript", "Next.js"],
                "status": "applied",
                "ai_match_percentage": 94,
                "ai_insight": "Exceeds Frontend Tech stack criteria. High code velocity in verified university hackathons.",
                "applied_at": "Applied 2d ago"
            },
            {
                "internship_id": inserted_internships["Datadog"],
                "internship_title": "Data Intelligence Specialist Intern",
                "company_name": "TechCorp Ventures",
                "student_id": inserted_users["sarah.lin@berkeley.edu"],
                "student_name": "Sarah Lin",
                "student_university": "UC Berkeley",
                "student_degree": "M.S. Data Intelligence",
                "student_avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuDTKSCIejfCMnsu2lbHTSWb1d9Qn65FqwZdUbFyR1lhMeutIBwMWfiBBbxP3Whii45FN7igaf2gWPG7GOoRY07PmpWpo6snuOGjR9qCjb-AwnC3NUCX1IeHiem0Ku-ErDywd_Cfk_DwqKJm8GkNK1Jhh5bAAe1YB1y7M-QNMx8xAI-HVno0RYAy0gF4b0FZDmMYDXB86dl8JJhnrSGssDjLU0EgbfUWm5UPxhEE5n9lyFYNWwfj0mw3BA",
                "skills": ["Python", "PyTorch", "ML Pipelines", "SQL"],
                "status": "in_review",
                "ai_match_percentage": 88,
                "ai_insight": "Strong PyTorch model deployment experience with high accuracy track records.",
                "applied_at": "Applied 3d ago"
            },
            {
                "internship_id": inserted_internships["Figma"],
                "internship_title": "Cloud Infrastructure & Systems Intern",
                "company_name": "TechCorp Ventures",
                "student_id": inserted_users["david.kim@mit.edu"],
                "student_name": "David Kim",
                "student_university": "MIT",
                "student_degree": "B.S. Systems & Cloud",
                "student_avatar": "",
                "skills": ["Go", "Kubernetes", "AWS", "Rust"],
                "status": "interview",
                "ai_match_percentage": 91,
                "ai_insight": "Exceptional container orchestration background. AWS certified practitioner.",
                "applied_at": "Applied 5d ago",
                "interview_date": "Tomorrow, 2:00 PM PST",
                "interview_notes": "Technical Architecture & Distributed Systems Round"
            }
        ]
        db.applications.insert_many(applications_data)

        # 5. TASKS & MENTORSHIP
        tasks_data = [
            {
                "mentor_id": inserted_users["mentor@industry.org"],
                "mentor_name": "Dr. Elena Vance",
                "intern_id": inserted_users["student@university.edu"],
                "intern_name": "Alex Morgan",
                "intern_role": "Stripe SWE Intern",
                "company": "Stripe",
                "title": "API Pagination PR submission",
                "description": "Implemented cursor-based pagination across /v1/payouts endpoint with Redis cache invalidation tests.",
                "priority": "high",
                "deadline": "Today at 5:00 PM",
                "milestone": "Milestone 1",
                "status": "submitted",
                "pr_info": "PR #142 • 18 files changed",
                "submission_notes": "Cursor token encryption added, integration tests passing with 98% coverage.",
                "supervisor_feedback": "Solid architecture on cursor tokens. Check boundary conditions when limit=0 before deployment.",
                "created_at": "2025-05-10T10:00:00Z"
            },
            {
                "mentor_id": inserted_users["mentor@industry.org"],
                "mentor_name": "Dr. Elena Vance",
                "intern_id": inserted_users["sarah.lin@berkeley.edu"],
                "intern_name": "Sarah Chen",
                "intern_role": "Palantir Placement",
                "company": "Palantir",
                "title": "ETL Pipeline DAG Migration",
                "description": "Migrate legacy Airflow operators to modern dynamic DAG generation script.",
                "priority": "medium",
                "deadline": "Friday, May 16",
                "milestone": "Milestone 2",
                "status": "pending",
                "pr_info": "Draft PR #89",
                "submission_notes": "",
                "supervisor_feedback": "",
                "created_at": "2025-05-09T08:00:00Z"
            },
            {
                "mentor_id": inserted_users["mentor@industry.org"],
                "mentor_name": "Dr. Elena Vance",
                "intern_id": inserted_users["david.kim@mit.edu"],
                "intern_name": "Marcus Vance",
                "intern_role": "Cloud Platform Intern",
                "company": "TechCorp Ventures",
                "title": "Mobile Push Notification Integration",
                "description": "FCM notification dispatcher service with retry queues and telemetry instrumentation.",
                "priority": "low",
                "deadline": "Completed",
                "milestone": "Milestone 3",
                "status": "approved",
                "pr_info": "PR #104 (Merged)",
                "submission_notes": "Implemented with exponential backoff.",
                "supervisor_feedback": "Approved and merged to staging. Excellent execution.",
                "created_at": "2025-05-01T09:00:00Z"
            }
        ]
        db.tasks.insert_many(tasks_data)

        # 6. PENDING COMPANY VERIFICATIONS (Admin Queue)
        db.company_verifications.insert_one({
            "company_id": "apex-robotics-01",
            "company_name": "Apex Robotics Inc.",
            "logo_initial": "AR",
            "tier": "Enterprise Tier",
            "documentation": "Articles of Incorporation & SOC2 Type II",
            "file_size": "PDF (12.4 MB)",
            "verification_status": "pending",
            "submitted_at": now_str,
            "notes": "Enterprise tier documentation submitted • EIN & D&B Verified"
        })

        # 7. PLATFORM AUDIT LOGS
        audit_logs = [
            {
                "title": "New user registration spike detected",
                "description": "+420 students onboarded from Stanford & MIT cluster hubs.",
                "category": "system",
                "timestamp": "4m ago",
                "icon": "trending_up"
            },
            {
                "title": "Role permissions updated",
                "description": "SuperAdmin updated recruiter vetting policy to Tier 3 compliance.",
                "category": "security",
                "timestamp": "22m ago",
                "icon": "shield_person"
            },
            {
                "title": "Vector embedding cache sync",
                "description": "AI engine indexed 1,280 new candidate CV vectors successfully.",
                "category": "ai",
                "timestamp": "1h ago",
                "icon": "smart_toy"
            }
        ]
        db.audit_logs.insert_many(audit_logs)

        # 8. NOTIFICATIONS
        notifications_data = [
            {
                "user_id": inserted_users["student@university.edu"],
                "title": "Interview Invitation",
                "message": "Stripe Recruiter invited you to technical phone screen for SWE Summer 2025.",
                "type": "success",
                "read": False,
                "created_at": "1h ago"
            },
            {
                "user_id": inserted_users["student@university.edu"],
                "title": "Task Feedback from Mentor",
                "message": "Dr. Elena Vance left inline supervisor review on PR #142.",
                "type": "info",
                "read": False,
                "created_at": "2h ago"
            },
            {
                "user_id": inserted_users["recruiter@enterprise.com"],
                "title": "New Candidate Applied",
                "message": "Alex Morgan applied for Software Engineering Intern.",
                "type": "info",
                "read": False,
                "created_at": "3h ago"
            }
        ]
        db.notifications.insert_many(notifications_data)

        logger.info("Database seeding successfully completed!")

    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
