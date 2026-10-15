from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.database.connection import get_db, serialize_doc, to_object_id

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)):
    """Validate JWT token and retrieve the user from MongoDB."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    db = get_db()
    
    # Try finding by ObjectId or string
    user = db.users.find_one({"_id": to_object_id(user_id)})
    if not user:
        user = db.users.find_one({"email": user_id})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact platform administrators.",
        )

    clean_user = serialize_doc(user)
    clean_user.pop("password_hash", None)
    return clean_user

def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)):
    """Optional user dependency for public-browse endpoints."""
    if not credentials:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None

def require_role(allowed_roles: List[str]):
    """Enforce server-side Role-Based Access Control (RBAC)."""
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role '{allowed_roles}', but user has role '{user_role}'"
            )
        return current_user
    return role_checker
