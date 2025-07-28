import os
import logging
from datetime import datetime, timedelta

from dotenv import load_dotenv

from ..celery_app import app
from db.database import AppDatabase

load_dotenv()

logger = logging.getLogger(__name__)


@app.task(name="email.verification.cleanup")
def cleanup_expired_registrations():
    """
    Clean up expired pending registrations and old verification logs.
    
    This task runs periodically to:
    1. Remove expired pending registrations (backup to TTL index)
    2. Clean up old verification logs (>30 days)
    3. Generate cleanup statistics
    4. Log cleanup results
    
    Returns:
        dict: Cleanup statistics
    """
    try:
        db = AppDatabase()
        
        # Get collections
        pending_registrations_collection = db["pending_registrations"]
        verification_logs_collection = db["email_verification_logs"]
        
        # Current time for calculations
        current_time = datetime.utcnow()
        
        # 1. Clean up expired pending registrations (backup to TTL index)
        expired_cutoff = current_time
        expired_result = pending_registrations_collection.delete_many({
            "expires_at": {"$lt": expired_cutoff}
        })
        expired_count = expired_result.deleted_count
        
        # 2. Clean up old verification logs (>30 days)
        log_cutoff = current_time - timedelta(days=30)
        old_logs_result = verification_logs_collection.delete_many({
            "timestamp": {"$lt": log_cutoff}
        })
        old_logs_count = old_logs_result.deleted_count
        
        # 3. Get current statistics
        pending_count = pending_registrations_collection.count_documents({})
        recent_logs_count = verification_logs_collection.count_documents({
            "timestamp": {"$gte": log_cutoff}
        })
        
        # 4. Generate cleanup statistics
        cleanup_stats = {
            "timestamp": current_time.isoformat(),
            "expired_registrations_removed": expired_count,
            "old_logs_removed": old_logs_count,
            "current_pending_registrations": pending_count,
            "current_recent_logs": recent_logs_count,
            "cleanup_successful": True
        }
        
        # 5. Log cleanup results
        logger.info(
            f"Email verification cleanup completed: "
            f"{expired_count} expired registrations removed, "
            f"{old_logs_count} old logs removed, "
            f"{pending_count} pending registrations remaining"
        )
        
        # 6. Check for unusual patterns and alert if needed
        if expired_count > 100:
            logger.warning(
                f"High number of expired registrations cleaned up: {expired_count}. "
                "This might indicate an issue with email delivery or user experience."
            )
        
        if pending_count > 1000:
            logger.warning(
                f"High number of pending registrations: {pending_count}. "
                "Consider investigating potential issues with verification process."
            )
        
        return cleanup_stats
        
    except Exception as e:
        error_message = f"Email verification cleanup failed: {str(e)}"
        logger.error(error_message)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "expired_registrations_removed": 0,
            "old_logs_removed": 0,
            "current_pending_registrations": 0,
            "current_recent_logs": 0,
            "cleanup_successful": False,
            "error_message": error_message
        }


@app.task(name="email.verification.stats")
def generate_verification_statistics():
    """
    Generate email verification statistics for monitoring.
    
    This task generates comprehensive statistics about the email verification
    system for monitoring and alerting purposes.
    
    Returns:
        dict: Verification statistics
    """
    try:
        db = AppDatabase()
        
        # Get collections
        pending_registrations_collection = db["pending_registrations"]
        verification_logs_collection = db["email_verification_logs"]
        users_collection = db["user"]
        
        # Time ranges for analysis
        current_time = datetime.utcnow()
        last_24h = current_time - timedelta(hours=24)
        last_7d = current_time - timedelta(days=7)
        last_30d = current_time - timedelta(days=30)
        
        # Pending registrations statistics
        total_pending = pending_registrations_collection.count_documents({})
        pending_24h = pending_registrations_collection.count_documents({
            "created_at": {"$gte": last_24h}
        })
        expired_pending = pending_registrations_collection.count_documents({
            "expires_at": {"$lt": current_time}
        })
        
        # Verification logs statistics
        signup_requests_24h = verification_logs_collection.count_documents({
            "action": "signup_request",
            "timestamp": {"$gte": last_24h}
        })
        
        verification_attempts_24h = verification_logs_collection.count_documents({
            "action": "verification_attempt",
            "timestamp": {"$gte": last_24h}
        })
        
        successful_verifications_24h = verification_logs_collection.count_documents({
            "action": "verification_success",
            "timestamp": {"$gte": last_24h}
        })
        
        # Calculate success rates
        verification_success_rate = (
            successful_verifications_24h / verification_attempts_24h * 100
            if verification_attempts_24h > 0 else 0
        )
        
        signup_to_verification_rate = (
            successful_verifications_24h / signup_requests_24h * 100
            if signup_requests_24h > 0 else 0
        )
        
        # User growth statistics
        new_users_24h = users_collection.count_documents({
            "_id": {"$gte": ObjectId.from_datetime(last_24h)}
        })
        
        new_users_7d = users_collection.count_documents({
            "_id": {"$gte": ObjectId.from_datetime(last_7d)}
        })
        
        # Generate comprehensive statistics
        stats = {
            "timestamp": current_time.isoformat(),
            "pending_registrations": {
                "total": total_pending,
                "created_last_24h": pending_24h,
                "expired": expired_pending
            },
            "verification_activity_24h": {
                "signup_requests": signup_requests_24h,
                "verification_attempts": verification_attempts_24h,
                "successful_verifications": successful_verifications_24h,
                "verification_success_rate": round(verification_success_rate, 2),
                "signup_to_verification_rate": round(signup_to_verification_rate, 2)
            },
            "user_growth": {
                "new_users_24h": new_users_24h,
                "new_users_7d": new_users_7d
            },
            "health_indicators": {
                "high_pending_registrations": total_pending > 1000,
                "low_verification_rate": verification_success_rate < 50,
                "low_signup_conversion": signup_to_verification_rate < 30
            }
        }
        
        # Log important metrics
        logger.info(
            f"Email verification stats: "
            f"{signup_requests_24h} signups, "
            f"{successful_verifications_24h} verifications, "
            f"{verification_success_rate:.1f}% success rate"
        )
        
        # Alert on concerning metrics
        if verification_success_rate < 50 and verification_attempts_24h > 10:
            logger.warning(
                f"Low verification success rate: {verification_success_rate:.1f}% "
                f"({successful_verifications_24h}/{verification_attempts_24h})"
            )
        
        if signup_to_verification_rate < 30 and signup_requests_24h > 10:
            logger.warning(
                f"Low signup to verification conversion: {signup_to_verification_rate:.1f}% "
                f"({successful_verifications_24h}/{signup_requests_24h})"
            )
        
        return stats
        
    except Exception as e:
        error_message = f"Email verification statistics generation failed: {str(e)}"
        logger.error(error_message)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": error_message,
            "stats_successful": False
        }


# Import ObjectId for user growth calculations
try:
    from bson import ObjectId
except ImportError:
    logger.warning("bson.ObjectId not available, user growth stats will be limited")
