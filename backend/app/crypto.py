"""Field-level encryption for sensitive database columns (AES via Fernet).

Values are encrypted in Python before being written and decrypted after being
read, so even someone with raw database access (leaked backup, exposed
Supabase REST API, compromised DB credentials) only sees ciphertext.

Usage in models:
    correct_option: Mapped[str] = mapped_column(EncryptedText, nullable=False)

Behaviour:
- If DATA_ENCRYPTION_KEY is set, new values are encrypted with the first key.
- Legacy plaintext values (written before encryption was enabled) are still
  readable, so the rollout needs no downtime. A startup migration in main.py
  encrypts them in place.
- If DATA_ENCRYPTION_KEY is NOT set, values are stored as plaintext (a warning
  is logged at startup).
"""

import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy.types import Text, TypeDecorator

from app.config import get_settings

logger = logging.getLogger(__name__)

# Every Fernet token starts with version byte 0x80 -> "gAAAAA" in base64.
_FERNET_PREFIX = "gAAAAA"

_fernet: Optional[MultiFernet] = None
_initialised = False


def _get_fernet() -> Optional[MultiFernet]:
    global _fernet, _initialised
    if _initialised:
        return _fernet
    _initialised = True
    raw = get_settings().DATA_ENCRYPTION_KEY.strip()
    if not raw:
        _fernet = None
        return None
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    try:
        _fernet = MultiFernet([Fernet(k.encode()) for k in keys])
    except Exception as exc:  # malformed key
        raise RuntimeError(
            "DATA_ENCRYPTION_KEY is invalid. It must be a urlsafe base64 32-byte Fernet key."
        ) from exc
    return _fernet


def encryption_enabled() -> bool:
    return _get_fernet() is not None


def is_encrypted(value: Optional[str]) -> bool:
    return bool(value) and value.startswith(_FERNET_PREFIX)  # type: ignore[union-attr]


def encrypt_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    f = _get_fernet()
    if f is None or is_encrypted(value):
        return value
    return f.encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_value(value: Optional[str]) -> Optional[str]:
    if value is None or not is_encrypted(value):
        return value  # legacy plaintext
    f = _get_fernet()
    if f is None:
        raise RuntimeError(
            "Encrypted data found in the database but DATA_ENCRYPTION_KEY is not configured."
        )
    try:
        return f.decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError(
            "Failed to decrypt data: DATA_ENCRYPTION_KEY does not match the key used to encrypt it."
        ) from exc


class EncryptedText(TypeDecorator):
    """A TEXT column whose contents are transparently encrypted at rest."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_value(value)

    def process_result_value(self, value, dialect):
        return decrypt_value(value)
