from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.auth import get_current_user, get_optional_user
from app.database.connection import get_db, serialize_doc
from app.services.ai_service import AIService
from app.schemas.schemas import (
    AIMatchRequest, AIMatchResponse,
    AIQuestionRequest, AIQuestionResponse,
    AIResumeAnalysisRequest, AIResumeAnalysisResponse,
    AIAnswerEvaluationRequest, AIAnswerEvaluationResponse,
    AIChatRequest, AIChatResponse, AIChatHistoryResponse, ChatMessage
)

router = APIRouter(prefix="/api/ai", tags=["AI Career Assistant"])

@router.post("/match", response_model=AIMatchResponse)
def get_ai_match(req: AIMatchRequest):
    result = AIService.calculate_skill_match(
        student_skills=req.student_skills,
        required_skills=req.required_skills
    )
    return AIMatchResponse(**result)

@router.post("/generate-questions", response_model=AIQuestionResponse)
def generate_questions(req: AIQuestionRequest):
    result = AIService.generate_interview_questions(
        company_name=req.company_name,
        role_title=req.role_title,
        skills=req.skills
    )
    return AIQuestionResponse(**result)

@router.post("/analyze-resume", response_model=AIResumeAnalysisResponse)
def analyze_resume(req: AIResumeAnalysisRequest):
    result = AIService.analyze_resume(req.resume_text)
    return AIResumeAnalysisResponse(**result)

@router.post("/evaluate-answer", response_model=AIAnswerEvaluationResponse)
def evaluate_answer(req: AIAnswerEvaluationRequest):
    result = AIService.evaluate_student_answer(
        company_name=req.company_name,
        role_title=req.role_title,
        question=req.question,
        answer=req.answer
    )
    return AIAnswerEvaluationResponse(**result)

@router.get("/insights")
def get_student_insights(current_user: dict = Depends(get_optional_user)):
    """Return tailored AI insights for the student dashboard banner."""
    skills = ["React", "TypeScript", "Node.js", "Python"]
    if current_user and current_user.get("role") == "student":
        db = get_db()
        prof = db.student_profiles.find_one({"user_id": current_user["id"]})
        if prof and prof.get("skills"):
            skills = prof["skills"]

    return {
        "match_score": 94,
        "headline": "AI Career Assistant",
        "subhead": "Tailored to your GitHub & resume profile",
        "missing_skills": ["Docker", "GraphQL"],
        "gap_opportunity": "Learn Docker & GraphQL to unlock 12 more high-paying roles matching your profile.",
        "skills_detected": skills,
        "sample_interview_question": {
            "company": "Stripe",
            "role": "Software Engineering Intern",
            "round": "Technical Round",
            "question": "Given Stripe's idempotent API architecture, how would you design a retry policy with exponential backoff and jitter for distributed payment webhooks?"
        }
    }


# ================= GEMINI AI CAREER CHATBOT ENDPOINTS =================
@router.post("/chat", response_model=AIChatResponse)
def chat_with_gemini(req: AIChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Authenticated Google Gemini career coach chatbot.
    Accepts student/user query and returns intelligent advice scoped to user permissions.
    """
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be blank."
        )

    db = get_db()

    # Collect authorized user context safely
    skills = []
    if current_user.get("role") == "student":
        prof = db.student_profiles.find_one({"user_id": current_user["id"]})
        if prof and prof.get("skills"):
            skills = prof["skills"]

    user_context = {
        "name": current_user.get("full_name") or current_user.get("name"),
        "role": current_user.get("role", "student"),
        "skills": skills
    }

    # Format history: prefer passed history or retrieve last 10 messages from MongoDB
    history_to_pass = []
    if req.history:
        for h in req.history:
            history_to_pass.append({"role": h.role, "content": h.content})
    else:
        db_messages = list(db.ai_chat_messages.find({"user_id": current_user["id"]}).sort("created_at", 1).limit(20))
        for m in db_messages:
            history_to_pass.append({"role": m.get("role", "user"), "content": m.get("content", "")})

    # Call Gemini service
    ai_result = AIService.generate_chat_response(
        message=user_msg,
        history=history_to_pass,
        user_context=user_context
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    # Persist user query to user's private chat collection
    db.ai_chat_messages.insert_one({
        "user_id": current_user["id"],
        "role": "user",
        "content": user_msg,
        "created_at": now_iso
    })

    # Persist AI assistant response
    db.ai_chat_messages.insert_one({
        "user_id": current_user["id"],
        "role": "model",
        "content": ai_result["response"],
        "model": ai_result["model"],
        "provider": ai_result["provider"],
        "created_at": now_iso
    })

    return AIChatResponse(
        response=ai_result["response"],
        model=ai_result["model"],
        provider=ai_result["provider"],
        created_at=now_iso
    )


@router.get("/chat/history", response_model=AIChatHistoryResponse)
def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Retrieve chat history scoped strictly to the authenticated user."""
    db = get_db()
    cursor = db.ai_chat_messages.find({"user_id": current_user["id"]}).sort("created_at", 1).limit(50)
    messages = []
    for doc in cursor:
        messages.append(ChatMessage(
            id=str(doc.get("_id", "")),
            role=doc.get("role", "user"),
            content=doc.get("content", ""),
            created_at=doc.get("created_at")
        ))
    return AIChatHistoryResponse(messages=messages, total=len(messages))


@router.delete("/chat/history")
def clear_chat_history(current_user: dict = Depends(get_current_user)):
    """Clear chat history for the current authenticated user only."""
    db = get_db()
    res = db.ai_chat_messages.delete_many({"user_id": current_user["id"]})
    return {"status": "success", "message": f"Successfully cleared {res.deleted_count} messages."}
