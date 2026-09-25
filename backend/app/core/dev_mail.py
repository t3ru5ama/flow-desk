"""In-memory dev-only mailbox. No email provider is configured in local dev,
so password-reset/invite links are logged to console and stashed here for
GET /api/dev/last-email to retrieve during manual/E2E testing."""

_last_email: dict | None = None


def record(to: str, subject: str, link: str) -> None:
    global _last_email
    _last_email = {"to": to, "subject": subject, "link": link}
    print(f"[dev-mail] To: {to} | {subject} | {link}")


def get_last() -> dict | None:
    return _last_email
