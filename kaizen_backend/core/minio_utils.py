"""
MinIO Storage Utilities
=======================
Provides a MinIO client, bucket initialization, and pre-signed URL generation.
Used by image upload views and serializers.
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def get_minio_client():
    """Return a configured MinIO Python client instance."""
    from minio import Minio
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_HTTPS,
    )


def ensure_bucket_exists():
    """
    Create the MinIO bucket if it doesn't already exist.
    Sets a public-read policy so images can be accessed directly via URL.
    Called at startup via Django AppConfig.ready().
    """
    import json
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET_NAME

    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f'MinIO: Created bucket "{bucket}"')

            # Set bucket policy to allow public read access for images
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket}/*"]
                    }
                ]
            }
            client.set_bucket_policy(bucket, json.dumps(policy))
            logger.info(f'MinIO: Set public-read policy on bucket "{bucket}"')
        else:
            logger.info(f'MinIO: Bucket "{bucket}" already exists.')
    except Exception as exc:
        logger.warning(f'MinIO: Could not initialize bucket "{bucket}": {exc}')


def get_presigned_url(object_name: str, expires_seconds: int = 3600) -> str | None:
    """
    Generate a pre-signed GET URL for a MinIO object.
    Returns None if object_name is empty/None.
    """
    from datetime import timedelta
    if not object_name:
        return None
    try:
        client = get_minio_client()
        url = client.presigned_get_object(
            bucket_name=settings.MINIO_BUCKET_NAME,
            object_name=object_name,
            expires=timedelta(seconds=expires_seconds),
        )
        return url
    except Exception as exc:
        logger.warning(f'MinIO: Could not generate presigned URL for {object_name}: {exc}')
        return None


def delete_object(object_name: str) -> bool:
    """Delete an object from MinIO. Returns True if deleted, False on error."""
    if not object_name:
        return False
    try:
        client = get_minio_client()
        client.remove_object(settings.MINIO_BUCKET_NAME, object_name)
        return True
    except Exception as exc:
        logger.warning(f'MinIO: Could not delete {object_name}: {exc}')
        return False
