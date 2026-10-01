"""Google Drive API v3 upload service supporting Service Account credentials and API Key."""

import io
import os
import logging
from app.config import get_settings

try:
    from googleapiclient.discovery import build  # type: ignore
    from googleapiclient.http import MediaIoBaseUpload  # type: ignore
    from google.oauth2 import service_account  # type: ignore
    GDRIVE_AVAILABLE = True
except ImportError:
    GDRIVE_AVAILABLE = False

logger = logging.getLogger(__name__)
settings = get_settings()


def upload_to_gdrive(image_bytes: bytes, filename: str) -> str | None:
    """
    Upload an image to Google Drive using Service Account credentials or API key.
    Returns the public web view URL, or None if upload fails.
    """
    if not GDRIVE_AVAILABLE:
        logger.warning("Google Drive client libraries not installed.")
        return None

    sa_file = settings.GDRIVE_SERVICE_ACCOUNT_FILE
    folder_id = settings.GDRIVE_FOLDER_ID
    api_key = settings.GDRIVE_API_KEY

    if not folder_id:
        logger.warning("Google Drive folder ID not configured. Skipping upload.")
        return None

    try:
        service = None

        if os.path.exists(sa_file):
            credentials = service_account.Credentials.from_service_account_file(
                sa_file,
                scopes=["https://www.googleapis.com/auth/drive.file"],
            )
            service = build("drive", "v3", credentials=credentials)
            logger.info("Using Google Drive Service Account credentials.")
        elif api_key:
            service = build("drive", "v3", developerKey=api_key)
            logger.info("Using Google Drive API Key.")
        else:
            logger.warning("Neither service_account.json nor GDRIVE_API_KEY is available. Skipping upload.")
            return None

        # Upload file
        file_metadata = {
            "name": filename,
            "parents": [folder_id],
        }
        media = MediaIoBaseUpload(
            io.BytesIO(image_bytes),
            mimetype="image/jpeg",
            resumable=True,
        )
        uploaded_file = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id,webViewLink,webContentLink")
            .execute()
        )

        file_id = uploaded_file.get("id")

        # Attempt to set public read permission if service account is used
        try:
            service.permissions().create(
                fileId=file_id,
                body={"type": "anyone", "role": "reader"},
            ).execute()
        except Exception:
            pass  # Permissions call may require full OAuth/Service Account scope

        # Return public URL
        view_url = uploaded_file.get("webViewLink") or f"https://drive.google.com/file/d/{file_id}/view"
        logger.info(f"Uploaded to GDrive: {view_url}")
        return view_url

    except Exception as e:
        logger.error(f"Google Drive upload failed: {e}")
        return None
