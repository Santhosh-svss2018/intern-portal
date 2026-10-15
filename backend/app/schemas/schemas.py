from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# ================= AUTH SCHEMAS =================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = Field(..., description="'student', 'company', 'mentor', or 'admin'")
    organization: Optional[str] = None
    title: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    profile: Optional[dict] = None

# ================= STUDENT PROFILE SCHEMAS =================
class StudentProfileUpdate(BaseModel):
    university: Optional[str] = None
    degree: Optional[str] = None
    grad_year: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    bio: Optional[str] = None
    gpa: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    resume_text: Optional[str] = None
    readiness_score: Optional[int] = None

# ================= INTERNSHIP SCHEMAS =================
class InternshipCreate(BaseModel):
    title: str
    company_name: str
    location: str
    work_mode: str = "Remote" # Remote, Hybrid, On-site
    stipend: str
    stipend_numeric: Optional[float] = 40.0
    duration: str = "12 Weeks (Summer 2025)"
    skills_required: List[str]
    description: str
    deadline: str
    category: Optional[str] = "Software Eng" # Software Eng, AI & ML, Data Science, Product

class InternshipUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    stipend: Optional[str] = None
    stipend_numeric: Optional[float] = None
    duration: Optional[str] = None
    skills_required: Optional[List[str]] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None

class InternshipResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    company_name: str
    company_initial: Optional[str] = None
    title: str
    location: str
    work_mode: str
    stipend: str
    stipend_numeric: Optional[float] = 40.0
    duration: str
    skills_required: List[str]
    description: str
    deadline: str
    category: Optional[str] = "Software Eng"
    status: str = "active"
    posted_at: Optional[str] = None
    ai_match_percentage: Optional[int] = 85
    ai_match_reason: Optional[str] = None
    is_saved: Optional[bool] = False

# ================= APPLICATION SCHEMAS =================
class StatusHistoryItem(BaseModel):
    status: str
    timestamp: str
    actor_id: str
    actor_role: str
    feedback: Optional[str] = None

class ApplicationCreate(BaseModel):
    internship_id: str
    resume_text: Optional[str] = None
    cover_note: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str # "applied", "in_review", "shortlisted", "interview", "rejected", "accepted"
    interview_date: Optional[str] = None
    interview_notes: Optional[str] = None
    feedback: Optional[str] = None
    current_status: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    internship_id: str
    internship_title: str
    company_id: Optional[str] = None
    company_name: str
    student_id: str
    student_name: str
    student_university: Optional[str] = None
    student_degree: Optional[str] = None
    student_avatar: Optional[str] = None
    skills: List[str] = []
    status: str
    ai_match_percentage: int = 85
    ai_insight: Optional[str] = None
    applied_at: str
    interview_date: Optional[str] = None
    interview_notes: Optional[str] = None
    status_history: Optional[List[StatusHistoryItem]] = []

# ================= TASK SCHEMAS =================
class TaskCreate(BaseModel):
    intern_id: str
    title: str
    description: str
    priority: str = "medium" # "high", "medium", "low"
    deadline: str
    milestone: Optional[str] = "Milestone 1"

class TaskSubmit(BaseModel):
    pr_info: str
    submission_notes: str
    repo_url: Optional[str] = None

class TaskReview(BaseModel):
    status: str # "approved", "revision_requested"
    supervisor_feedback: str

class TaskResponse(BaseModel):
    id: str
    mentor_id: str
    mentor_name: str
    intern_id: str
    intern_name: str
    intern_role: Optional[str] = None
    company: Optional[str] = None
    title: str
    description: str
    priority: str
    deadline: str
    milestone: Optional[str] = None
    status: str # "pending", "submitted", "approved", "revision_requested"
    pr_info: Optional[str] = None
    submission_notes: Optional[str] = None
    supervisor_feedback: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# ================= AI SCHEMAS =================
class AIMatchRequest(BaseModel):
    student_skills: List[str]
    required_skills: List[str]

class AIMatchResponse(BaseModel):
    match_percentage: int
    matching_skills: List[str]
    missing_skills: List[str]
    insight: str

class AIQuestionRequest(BaseModel):
    company_name: str
    role_title: str
    skills: Optional[List[str]] = None

class AIQuestionResponse(BaseModel):
    company_name: str
    role_title: str
    round_type: str
    question: str
    sample_answer_hint: str

class AIResumeAnalysisRequest(BaseModel):
    resume_text: str

class AIResumeAnalysisResponse(BaseModel):
    extracted_skills: List[str]
    suggested_improvements: List[str]
    score: int
    matching_roles_count: int

class AIAnswerEvaluationRequest(BaseModel):
    company_name: str
    role_title: str
    question: Optional[str] = None
    answer: str

class AIAnswerEvaluationResponse(BaseModel):
    score: int
    feedback: str
    strengths: List[str]
    areas_to_improve: List[str]
    detected_keywords: List[str]
    provider: str = "rule-based"

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str # "user" or "model" (or "assistant")
    content: str
    created_at: Optional[str] = None

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: Optional[List[ChatMessage]] = None

class AIChatResponse(BaseModel):
    response: str
    model: str
    provider: str
    created_at: str

class AIChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]
    total: int

# ================= ADMIN & AUDIT SCHEMAS =================
class AdminStatsResponse(BaseModel):
    total_users: int
    students_count: int = 0
    companies_count: int = 0
    mentors_count: int = 0
    admins_count: int = 0
    active_users: int = 0
    inactive_users: int = 0
    verified_companies: int = 0
    total_internships: int = 0
    active_internships: int = 0
    total_applications: int = 0
    applications_by_status: dict = {}
    interviews_count: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    task_completion_rate: int = 0
    users_breakdown: dict = {}
    cluster_status: str = "Cluster0 • MongoDB Atlas Live"

class CompanyVerificationUpdate(BaseModel):
    company_id: str
    status: str # "verified", "rejected"
    notes: Optional[str] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: str
    role: str # "student", "company", "mentor", "admin"
    organization: Optional[str] = None
    title: Optional[str] = None

class AdminUserRoleUpdate(BaseModel):
    role: str
    organization: Optional[str] = None
    title: Optional[str] = None

class AdminMentorAssignment(BaseModel):
    student_id: str
    mentor_id: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    audience: str = "all" # "all", "student", "company", "mentor"
    priority: str = "info" # "info", "warning", "urgent"
    category: Optional[str] = "general"
    expires_at: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: str
    title: str
    message: str
    audience: str
    priority: str
    category: Optional[str] = "general"
    created_by: str
    created_at: str
    recipient_count: Optional[int] = 0

# ================= NOTIFICATION SCHEMAS =================
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str # "info", "success", "warning", "error"
    read: bool
    created_at: str

