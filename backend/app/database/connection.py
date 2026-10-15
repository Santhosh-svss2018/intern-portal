import logging
import os
import re
from typing import Any, Dict, Optional
from bson import ObjectId
import pymongo
import mongomock
from app.core.config import settings

logger = logging.getLogger("internconnect.database")
logging.basicConfig(level=logging.INFO)

_client_instance: Optional[pymongo.MongoClient] = None
_db_instance = None
_is_mock = False


def sanitize_mongo_uri(uri: str) -> str:
    """Mask credentials in MongoDB connection URI for secure logging and error reporting."""
    if not uri:
        return ""
    return re.sub(r'(mongodb(?:\+srv)?://[^:]+:)([^@]+)(@)', r'\1****\3', uri)


def get_db(force_mock: bool = False):
    """
    Retrieve the active database instance.
    Connects to the configured MongoDB Atlas cluster (settings.MONGO_URI and settings.DB_NAME).
    Cleanly raises a ConnectionError if Atlas connection fails rather than silently falling back.
    Mock database is only used if explicitly requested (e.g., during tests).
    """
    global _client_instance, _db_instance, _is_mock
    if _db_instance is not None:
        return _db_instance

    # Explicit mock database mode for automated tests
    if force_mock or os.getenv("USE_MOCK_DB", "").lower() in ("true", "1") or settings.ENVIRONMENT == "test":
        logger.info(f"Using isolated mock database for '{settings.DB_NAME}' (test/mock mode)")
        mock_client = mongomock.MongoClient()
        _client_instance = mock_client
        _db_instance = mock_client[settings.DB_NAME]
        _is_mock = True
        return _db_instance

    sanitized_uri = sanitize_mongo_uri(settings.MONGO_URI)
    try:
        logger.info(f"Attempting connection to MongoDB at: {sanitized_uri}")
        # Server selection timeout: 10000ms is resilient for cloud Atlas
        client = pymongo.MongoClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        # Verify connectivity by issuing a ping
        client.admin.command('ping')
        _client_instance = client
        _db_instance = client[settings.DB_NAME]
        _is_mock = False
        logger.info(f"Successfully connected to MongoDB database '{settings.DB_NAME}'")
        return _db_instance
    except Exception as e:
        _client_instance = None
        _db_instance = None
        _is_mock = False
        error_msg = f"Failed to connect to MongoDB Atlas at '{sanitized_uri}': {e}"
        logger.error(error_msg)
        # Never silently fall back to mock database during real operations
        raise ConnectionError(
            f"Failed to establish connection to MongoDB Atlas database '{settings.DB_NAME}'. "
            f"Please check your network access and credentials in .env. Details: {e}"
        ) from e


def close_db():
    """Cleanly close the MongoDB client connection during shutdown."""
    global _client_instance, _db_instance, _is_mock
    if _client_instance is not None:
        try:
            _client_instance.close()
            logger.info("Closed MongoDB client connection cleanly.")
        except Exception as e:
            logger.warning(f"Error while closing MongoDB connection: {e}")
    _client_instance = None
    _db_instance = None
    _is_mock = False


def check_db_health() -> Dict[str, Any]:
    """Check database health by attempting a live ping."""
    global _client_instance, _db_instance, _is_mock
    if _is_mock:
        return {"connected": True, "type": "in-memory-mock", "database": settings.DB_NAME}
    if _client_instance is None or _db_instance is None:
        return {"connected": False, "type": "disconnected", "database": settings.DB_NAME}
    try:
        _client_instance.admin.command('ping')
        return {"connected": True, "type": "mongodb-atlas-live", "database": settings.DB_NAME}
    except Exception as e:
        return {"connected": False, "type": "error", "error": str(e), "database": settings.DB_NAME}


def is_mock_db() -> bool:
    global _is_mock
    return _is_mock


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB _id to string 'id' for clean JSON serialization."""
    if not doc:
        return {}
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res["_id"])
        del res["_id"]
    return res


def to_object_id(id_str: str) -> Any:
    """Safe ObjectId converter."""
    try:
        return ObjectId(id_str)
    except Exception:
        return id_str
