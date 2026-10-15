import logging
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("internconnect.ai")

# Recognized technical skill taxonomy for extraction & matching
SKILL_TAXONOMY = [
    "React", "TypeScript", "JavaScript", "Node.js", "Next.js", "Python", 
    "FastAPI", "Django", "Flask", "PyTorch", "TensorFlow", "SQL", 
    "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", 
    "GCP", "Linux", "Go", "Golang", "Rust", "C++", "Java", 
    "GraphQL", "REST APIs", "Microservices", "Distributed Systems", 
    "Vector DBs", "WebGL", "CI/CD", "Machine Learning", "System Design"
]

COMPANY_QUESTION_BANK = {
    "Stripe": {
        "round": "Technical Round",
        "question": "Given Stripe's idempotent API architecture, how would you design a retry policy with exponential backoff and jitter for distributed payment webhooks?",
        "hint": "Mention idempotency keys, dead-letter queues, distributed locking, and state reconciliation."
    },
    "Datadog": {
        "round": "Systems Architecture",
        "question": "How would you architect a streaming telemetry ingestion pipeline that processes 500,000 metrics per second without dropping UDP packets under heavy GC pauses?",
        "hint": "Discuss ring buffers, eBPF packet capture, zero-copy socket buffers, and batch flushing."
    },
    "Figma": {
        "round": "Graphics & Frontend Systems",
        "question": "Explain how you would minimize layout thrashing and garbage collection spikes when rendering 10,000 animated vector nodes on a WebGL HTML5 canvas.",
        "hint": "Address spatial indexing (R-trees/Quadtrees), object pooling, offscreen rendering, and typed arrays."
    },
    "Notion": {
        "round": "AI Infrastructure Round",
        "question": "How would you design hybrid search combining dense vector embeddings (HNSW) with sparse BM25 keyword matching for sub-50ms enterprise document retrieval?",
        "hint": "Discuss reciprocal rank fusion (RRF), cross-encoder re-ranking, and quantization."
    },
    "Snowflake": {
        "round": "Database Internals Round",
        "question": "How does columnar data storage enable vectorized SIMD query execution, and how would you optimize predicate pushdown for partitioned Parquet files?",
        "hint": "Cover CPU cache locality, dictionary encoding, min/max metadata pruning, and branchless filtering."
    }
}

class AIService:
    @staticmethod
    def extract_skills_from_text(text: str) -> List[str]:
        """Extract recognized tech skills from resume or job description text."""
        if not text:
            return []
        found_skills = set()
        for skill in SKILL_TAXONOMY:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                found_skills.add(skill)
        return sorted(list(found_skills))

    @staticmethod
    def calculate_skill_match(student_skills: List[str], required_skills: List[str]) -> Dict[str, Any]:
        """Calculate match percentage, overlap, and missing skills."""
        s_set = {s.lower().strip() for s in student_skills}
        r_set = {r.lower().strip() for r in required_skills}

        if not r_set:
            return {
                "match_percentage": 95,
                "matching_skills": student_skills,
                "missing_skills": [],
                "insight": "General alignment with foundational criteria.",
                "provider": "rule-based"
            }

        matching = [r for r in required_skills if r.lower().strip() in s_set]
        missing = [r for r in required_skills if r.lower().strip() not in s_set]

        # Calculate percentage with base floor
        ratio = len(matching) / len(required_skills)
        match_percentage = max(60, min(99, int(ratio * 100)))

        insight = ""
        if match_percentage >= 90:
            insight = "Exceeds Core Tech stack criteria. High velocity profile."
        elif match_percentage >= 80:
            insight = f"Strong profile alignment. Missing {', '.join(missing[:2])} can be learned on the job."
        else:
            insight = f"Foundation is promising. Focus on {', '.join(missing[:2])} to increase match score."

        return {
            "match_percentage": match_percentage,
            "matching_skills": matching,
            "missing_skills": missing,
            "insight": insight,
            "provider": "gemini-api" if settings.AI_API_KEY else "rule-based"
        }

    @staticmethod
    def generate_interview_questions(company_name: str, role_title: str, skills: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate targeted practice interview question for a role."""
        company_key = company_name.strip()
        matched_company = None
        for key in COMPANY_QUESTION_BANK:
            if key.lower() in company_key.lower():
                matched_company = key
                break

        if matched_company and matched_company in COMPANY_QUESTION_BANK:
            entry = COMPANY_QUESTION_BANK[matched_company]
            return {
                "company_name": company_name,
                "role_title": role_title,
                "round_type": entry["round"],
                "question": entry["question"],
                "sample_answer_hint": entry["hint"],
                "provider": "rule-based"
            }

        # Dynamic fallback generation
        skill_sample = skills[0] if skills else "System Architecture"
        return {
            "company_name": company_name,
            "role_title": role_title,
            "round_type": "Technical Problem Solving",
            "question": f"Given {company_name}'s scale in {role_title}, how would you approach optimizing a high-concurrency microservice utilizing {skill_sample} under unexpected latency spikes?",
            "hint": "Analyze bottleneck isolation, connection pooling, backpressure mechanisms, and circuit breakers.",
            "provider": "rule-based"
        }

    @staticmethod
    def analyze_resume(resume_text: str) -> Dict[str, Any]:
        """Analyze student resume text, extract skills, and provide actionable tips."""
        extracted = AIService.extract_skills_from_text(resume_text)
        
        # Calculate score based on breadth and quality
        score = min(95, max(65, len(extracted) * 12))
        
        improvements = []
        if "Docker" not in extracted:
            improvements.append("Add Docker & Containerization project experience to appeal to DevOps & Backend roles.")
        if "SQL" not in extracted and "PostgreSQL" not in extracted:
            improvements.append("Highlight relational database design (PostgreSQL/MySQL) and query optimization.")
        if "Testing" not in resume_text:
            improvements.append("Mention automated testing metrics (e.g. 90%+ test coverage with Jest or Pytest).")
        if not improvements:
            improvements.append("Resume contains solid industry keywords. Emphasize quantified business impacts and metrics.")

        return {
            "extracted_skills": extracted,
            "suggested_improvements": improvements,
            "score": score,
            "matching_roles_count": max(4, len(extracted) * 3),
            "provider": "rule-based"
        }

    @staticmethod
    def evaluate_student_answer(company_name: str, role_title: str, question: Optional[str], answer: str) -> Dict[str, Any]:
        """Analyze student interview practice answer and generate actionable feedback."""
        extracted = AIService.extract_skills_from_text(answer)
        word_count = len(answer.split())
        
        score = min(96, max(60, 60 + len(extracted) * 8 + (15 if word_count >= 30 else 0)))
        
        strengths = []
        if extracted:
            strengths.append(f"Referenced relevant technical concepts: {', '.join(extracted[:4])}.")
        if word_count >= 35:
            strengths.append("Structured explanation with clear context and rationale.")
        else:
            strengths.append("Addressed the central technical principle concisely.")
            
        areas = []
        if word_count < 30:
            areas.append("Deepen your answer by walking through latency tradeoffs, failover scenarios, or production scale.")
        if not extracted:
            areas.append(f"Incorporate specific system primitives or architecture patterns expected at {company_name}.")
        else:
            areas.append(f"Consider citing telemetry metrics, idempotency guarantees, or SLA monitoring for {company_name}.")
            
        feedback = f"Assessment for {role_title} at {company_name}: " + " ".join(strengths) + " " + " ".join(areas)
        
        return {
            "score": score,
            "feedback": feedback,
            "strengths": strengths,
            "areas_to_improve": areas,
            "detected_keywords": extracted,
            "provider": "rule-based"
        }

    @staticmethod
    def _generate_rule_based_chat_fallback(message: str, user_context: Optional[Dict[str, Any]] = None) -> str:
        """Provide structured career coaching guidance when Gemini API key is missing or offline."""
        msg_lower = message.lower()
        user_name = (user_context or {}).get("name") or "there"

        if any(w in msg_lower for w in ["roadmap", "30-day", "30 day", "learning plan", "study plan"]):
            return (
                f"### 🚀 30-Day Full-Stack & Internship Acceleration Plan for {user_name}\n\n"
                "Here is an actionable roadmap designed to get you interview-ready and production-capable:\n\n"
                "#### Week 1: Modern Backend Core (Python & FastAPI)\n"
                "- **Goals**: Master async endpoints, Pydantic v2 schemas, and dependency injection.\n"
                "- **Daily Tasks**: Build a CRUD REST API with clean status codes and JWT token authentication.\n"
                "- **Mini-Milestone**: Test API thoroughly using pytest and Swagger UI (`/docs`).\n\n"
                "#### Week 2: Database Modeling & Persistence (MongoDB / PostgreSQL)\n"
                "- **Goals**: Design indexes, schemas, and aggregation pipelines.\n"
                "- **Daily Tasks**: Connect MongoDB Atlas with pymongo; implement connection pooling and environment security.\n"
                "- **Mini-Milestone**: Write automated tests using mock databases.\n\n"
                "#### Week 3: Frontend Integration & State (React + Vite)\n"
                "- **Goals**: Connect client to backend with Axios interceptors and AuthContext.\n"
                "- **Daily Tasks**: Build responsive UI components, manage loading/error states, and implement protected routes.\n"
                "- **Mini-Milestone**: Ship an end-to-end user flow from login to data submission.\n\n"
                "#### Week 4: Capstone Polish, Docker & Interview Prep\n"
                "- **Goals**: Containerize with Docker and practice technical interview communication.\n"
                "- **Daily Tasks**: Solve 2 LeetCode Mediums daily (Focus: Arrays, Trees, HashMaps). Review STAR stories.\n"
                "- **Mini-Milestone**: Deploy application live on Render / Railway and link repository on your resume."
            )

        if any(w in msg_lower for w in ["resume", "cv", "portfolio"]):
            return (
                f"### 📄 High-Impact Resume Optimization Strategies for {user_name}\n\n"
                "Top recruiters spend less than 10 seconds screening resumes. Use this proven framework:\n\n"
                "1. **Use the Google X-Y-Z Formula**:\n"
                "   - *Formula*: 'Accomplished [X] as measured by [Y], by doing [Z]'.\n"
                "   - *Example*: 'Reduced API latency by 42% by indexing MongoDB queries and implementing Redis caching.'\n\n"
                "2. **Highlight Technical Stack Explicitly**:\n"
                "   - Group skills into *Languages*, *Frameworks & Libraries*, *Databases & Cloud*, and *Developer Tools*.\n\n"
                "3. **Showcase Real Deployed Projects**:\n"
                "   - Include clickable links to live apps and GitHub repos with comprehensive READMEs.\n\n"
                "4. **Pass ATS Screening**:\n"
                "   - Keep single-column layout, standard fonts, and avoid images or complex tables."
            )

        if any(w in msg_lower for w in ["interview", "star", "behavioral", "mock"]):
            return (
                f"### 🎯 Technical & Behavioral Interview Masterclass for {user_name}\n\n"
                "Here is how to excel in top tech internship interviews:\n\n"
                "#### 1. The STAR Method for Behavioral Questions\n"
                "- **Situation**: Set the context in 1-2 concise sentences.\n"
                "- **Task**: Explain the explicit technical challenge or constraint.\n"
                "- **Action**: Detail *your specific actions* (e.g. 'I refactored the auth pipeline...').\n"
                "- **Result**: Highlight the measurable impact (e.g. 'Zero regression bugs, shipped 3 days early').\n\n"
                "#### 2. Technical Coding Strategy\n"
                "1. **Clarify Inputs & Edge Cases**: Ask about empty arrays, null values, and constraints.\n"
                "2. **State Naive Approach First**: Mention O(N²) solution, then optimize to O(N) or O(N log N).\n"
                "3. **Write Clean Code**: Use descriptive variable names and modular functions.\n"
                "4. **Dry Run**: Trace your code step-by-step with a test input before saying you are done."
            )

        return (
            f"### 💡 InternConnect Career Coach Advice for {user_name}\n\n"
            "Here are 3 high-impact steps to boost your internship trajectory:\n\n"
            "1. **Strengthen Your Core Stack**: Focus deeply on 1-2 modern frameworks (e.g., FastAPI + React) rather than surface-level knowledge of 10 tools.\n"
            "2. **Build Non-Trivial Projects**: Employers look for full-stack apps with auth, databases, background jobs, or AI integration over generic todo apps.\n"
            "3. **Targeted Networking**: Message university alumni and engineers on LinkedIn with personalized notes highlighting their recent work."
        )

    @staticmethod
    def generate_chat_response(
        message: str,
        history: Optional[List[Dict[str, Any]]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate career coaching response using Google Gemini API with fallback models and rule-based resilience.
        Never exposes API keys or internal stack traces to the client.
        """
        api_key = settings.AI_API_KEY.strip() if settings.AI_API_KEY else ""

        if not api_key:
            fallback = AIService._generate_rule_based_chat_fallback(message, user_context)
            return {
                "response": fallback,
                "model": "rule-based-career-engine",
                "provider": "rule-based"
            }

        try:
            from google.genai import Client, types
            from google.genai import errors
        except ImportError:
            fallback = AIService._generate_rule_based_chat_fallback(message, user_context)
            return {
                "response": fallback,
                "model": "rule-based-career-engine",
                "provider": "rule-based"
            }

        # Build context-aware system instruction
        name_str = f" The student's name is {(user_context or {}).get('name')}." if (user_context or {}).get("name") else ""
        role_str = f" User role in portal: {(user_context or {}).get('role', 'student')}."
        skills_list = (user_context or {}).get("skills") or []
        skills_str = f" Known skills: {', '.join(skills_list)}." if skills_list else ""

        system_instruction = (
            "You are InternConnect AI Career Coach, a professional, inspiring, and deeply technical mentor "
            "inside the InternConnect AI Internship Management Portal."
            f"{name_str}{role_str}{skills_str}\n\n"
            "Core Objectives:\n"
            "1. Guide students and interns on technical interview preparation (Data Structures, Algorithms, System Design, REST APIs, FastAPI, React).\n"
            "2. Offer concrete, structured study roadmaps, resume tips, and behavioral interview strategies using the STAR method.\n"
            "3. Provide clean code snippets, bulleted lists, and step-by-step guides.\n"
            "4. Be encouraging, concise, and realistic. Keep markdown well-structured with clear headers and bullet points.\n"
            "5. Privacy & Scope: Never hallucinate or disclose private database records of other users, confidential mentor reviews, or system credentials.\n"
            "6. If asked about live internship postings or portal admin actions, guide the student to the Internships or Applications tabs."
        )

        # Prepare formatted history for Gemini Client
        contents_history = []
        if history:
            for item in history[-10:]: # Keep last 10 messages for token efficiency and relevant context
                role = "user" if item.get("role") in ("user", "student") else "model"
                text = item.get("content", "").strip()
                if text:
                    contents_history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=text)]
                        )
                    )

        # Candidate models to try in order of preference
        primary_model = settings.GEMINI_MODEL or "gemini-3.8-flash"
        candidate_models = [primary_model]
        for fallback_m in ["gemini-3.5-flash-lite", "gemini-flash-latest"]:
            if fallback_m not in candidate_models:
                candidate_models.append(fallback_m)

        client = Client(api_key=api_key, http_options={"timeout": 5000})
        last_error = None

        for model_candidate in candidate_models:
            try:
                chat = client.chats.create(
                    model=model_candidate,
                    history=contents_history if contents_history else None,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7
                    )
                )
                res = chat.send_message(message)
                if res and res.text:
                    return {
                        "response": res.text.strip(),
                        "model": model_candidate,
                        "provider": "google-gemini"
                    }
            except Exception as e:
                last_error = e
                # Continue to next model candidate

        # If all Gemini models failed (e.g. rate limit, quota, network block), return graceful rule-based fallback
        fallback = AIService._generate_rule_based_chat_fallback(message, user_context)
        return {
            "response": fallback,
            "model": f"rule-based-fallback (Provider error: {type(last_error).__name__ if last_error else 'Unavailable'})",
            "provider": "rule-based"
        }

    @staticmethod
    def generate_candidate_crm_summary(candidate: dict, job: dict) -> dict:
        """
        Generate an advisory summary of authorized candidate information for recruiter review.
        STRICTLY ADVISORY: AI does not make automated hiring decisions.
        """
        candidate_name = candidate.get("student_name") or "Candidate"
        skills = candidate.get("skills") or []
        skills_str = ", ".join(skills) if skills else "General technical foundations"
        university = candidate.get("student_university") or "University"
        degree = candidate.get("student_degree") or "Engineering"
        job_title = job.get("title") or "Internship Role"
        required_skills = job.get("skills_required") or []
        req_str = ", ".join(required_skills) if required_skills else "Full-stack software engineering"

        api_key = settings.AI_API_KEY.strip() if settings.AI_API_KEY else ""
        if api_key and (api_key.startswith("AIzaSy") or not api_key.startswith("AQ.")):
            try:
                from google.genai import Client, types
                client = Client(api_key=api_key, http_options={"timeout": 5000})
                prompt = (
                    f"Candidate Profile:\n"
                    f"- Name: {candidate_name}\n"
                    f"- University: {university} ({degree})\n"
                    f"- Candidate Skills: {skills_str}\n"
                    f"- Resume Snippet: {candidate.get('resume_text', 'Not provided')[:600]}\n\n"
                    f"Target Opportunity:\n"
                    f"- Role: {job_title}\n"
                    f"- Required Tech Stack: {req_str}\n\n"
                    f"Generate a concise, professional CRM candidate summary for the recruiter. "
                    f"Highlight: (1) Core technical strengths and overlap with the role, "
                    f"(2) Coursework and project indicators, "
                    f"(3) Two specific technical topics for the interviewer to probe. "
                    f"IMPORTANT: Do not make an automated hiring decision. Conclude with an explicit reminder that live interview performance determines progression."
                )
                system_instruction = (
                    "You are the InternConnect AI Recruiter Talent Assistant. "
                    "Provide factual, objective, and constructive evaluations of student candidate qualifications. "
                    "Never make automated hire/reject decisions."
                )

                model_to_use = settings.GEMINI_MODEL or "gemini-3.8-flash"
                res = client.models.generate_content(
                    model=model_to_use,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.4
                    )
                )
                if res and res.text:
                    text = res.text.strip()
                    matched = [s for s in required_skills if any(s.lower() in cs.lower() for cs in skills)]
                    gaps = [s for s in required_skills if not any(s.lower() in cs.lower() for cs in skills)]
                    return {
                        "summary": text,
                        "key_strengths": matched if matched else skills[:4],
                        "suggested_verification_areas": gaps if gaps else ["System design tradeoffs", "Concurrency control"],
                        "recommended_stage": "Screening / Technical Assessment",
                        "provider": "google-gemini",
                        "disclaimer": "AI-generated candidate overview for recruiter reference. Not an automated hiring decision."
                    }
            except Exception as e:
                logger.warning(f"Gemini API CRM summary generation fallback: {e}")

        # Rule-based fallback
        matched = [s for s in required_skills if any(s.lower() in cs.lower() for cs in skills)]
        missing = [s for s in required_skills if not any(s.lower() in cs.lower() for cs in skills)]
        summary_text = (
            f"### Recruiter Candidate Brief: {candidate_name}\n\n"
            f"**Academic Background**: Enrolled at {university} pursuing {degree}.\n\n"
            f"**Technical Alignment**: Demonstrates strong proficiency in {', '.join(skills[:4]) if skills else 'core computing fundamentals'}. "
            f"Directly satisfies core role criteria for {', '.join(matched) if matched else 'foundational software development'}.\n\n"
            f"**Areas to Probe in Live Interview**: Verify hands-on depth in {', '.join(missing[:2]) if missing else 'distributed systems edge cases and testing best practices'}.\n\n"
            f"> *Note: This summary is prepared as an informational briefing for interviewers. Automated hiring decisions are disabled.*"
        )
        return {
            "summary": summary_text,
            "key_strengths": matched if matched else skills[:4],
            "suggested_verification_areas": missing[:3] if missing else ["Production observability", "Unit test coverage"],
            "recommended_stage": "Screening / Technical Assessment",
            "provider": "rule-based",
            "disclaimer": "AI-generated candidate overview for recruiter reference. Not an automated hiring decision."
        }

    @staticmethod
    def generate_crm_interview_questions(candidate: dict, job: dict, round_type: str = "Technical Round") -> dict:
        """
        Generate tailored interview questions and follow-up probes based on candidate background and role.
        """
        candidate_name = candidate.get("student_name") or "Candidate"
        skills = candidate.get("skills") or []
        job_title = job.get("title") or "Engineering Intern"
        company_name = job.get("company_name") or "Enterprise"
        required_skills = job.get("skills_required") or []

        api_key = settings.AI_API_KEY.strip() if settings.AI_API_KEY else ""
        if api_key and (api_key.startswith("AIzaSy") or not api_key.startswith("AQ.")):
            try:
                import json
                from google.genai import Client, types
                client = Client(api_key=api_key, http_options={"timeout": 5000})
                prompt = (
                    f"Role: {job_title} at {company_name}\n"
                    f"Candidate: {candidate_name}\n"
                    f"Skills: {', '.join(skills)}\n"
                    f"Required Skills: {', '.join(required_skills)}\n"
                    f"Round Type: {round_type}\n\n"
                    f"Generate exactly 4 targeted interview questions. For each question provide: "
                    f"(1) 'question': clear, realistic technical or situational question, "
                    f"(2) 'intent': what competency the interviewer is assessing, "
                    f"(3) 'follow_up_prompts': a list of 2 probing follow-up questions to test depth. "
                    f"Return ONLY a valid JSON array of objects with keys 'question', 'intent', and 'follow_up_prompts'."
                )
                model_to_use = settings.GEMINI_MODEL or "gemini-3.8-flash"
                res = client.models.generate_content(
                    model=model_to_use,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.5
                    )
                )
                if res and res.text:
                    clean_text = res.text.strip()
                    if clean_text.startswith("```"):
                        clean_text = re.sub(r"^```(?:json)?\n?", "", clean_text)
                        clean_text = re.sub(r"\n?```$", "", clean_text)
                    parsed = json.loads(clean_text)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return {
                            "candidate_name": candidate_name,
                            "internship_title": job_title,
                            "round_type": round_type,
                            "questions": parsed,
                            "provider": "google-gemini",
                            "disclaimer": "AI-generated questions for interviewer guidance only. Recruiter discretion advised."
                        }
            except Exception as e:
                logger.warning(f"Gemini API CRM questions generation fallback: {e}")

        # Deterministic rich fallback
        primary_skill = skills[0] if skills else "Python"
        secondary_skill = skills[1] if len(skills) > 1 else "React"
        req_skill = required_skills[0] if required_skills else "Distributed Systems"

        questions = [
            {
                "question": f"In your experience with {primary_skill}, walk us through how you handle asynchronous state management and latency bottlenecks in high-volume endpoints.",
                "intent": f"Assesses hands-on architectural competence and concurrency handling in {primary_skill}.",
                "follow_up_prompts": [
                    "What specific profiling tools or telemetry did you use to identify the bottleneck?",
                    "How would your approach change if data throughput increased by a factor of 50x?"
                ]
            },
            {
                "question": f"At {company_name}, reliability is paramount. How do you design APIs using {secondary_skill} to ensure graceful degradation when upstream dependencies fail?",
                "intent": "Evaluates fault tolerance, circuit breakers, and error recovery strategies.",
                "follow_up_prompts": [
                    "How do you distinguish between transient network retries and permanent database errors?",
                    "What fallback UI/API responses do you provide to the end user?"
                ]
            },
            {
                "question": f"Describe a project where you had to bridge {primary_skill} with {req_skill}. What was the most challenging technical tradeoff you encountered?",
                "intent": "Tests problem-solving depth, technical trade-off evaluation, and practical integration skills.",
                "follow_up_prompts": [
                    "If you had another two weeks on that project, what would you re-architect?",
                    "How did you validate data integrity and backward compatibility?"
                ]
            },
            {
                "question": "Can you share a time when you received rigorous code review feedback or had to resolve an engineering disagreement with a teammate?",
                "intent": "Assesses technical communication, receptivity to mentorship, and collaborative problem solving.",
                "follow_up_prompts": [
                    "What technical criteria did you use to reach consensus?",
                    "What did you learn that changed how you write code today?"
                ]
            }
        ]

        return {
            "candidate_name": candidate_name,
            "internship_title": job_title,
            "round_type": round_type,
            "questions": questions,
            "provider": "rule-based",
            "disclaimer": "AI-generated questions for interviewer guidance only. Recruiter discretion advised."
        }


