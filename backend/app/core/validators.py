import re
from typing import Annotated

from pydantic import AfterValidator

# RFC 5322 subset — deliberately permissive about TLDs (accepts .test/.local
# etc.) since seed/dev data uses acme.test-style addresses.
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_email(v: str) -> str:
    if not EMAIL_RE.match(v) or len(v) > 255:
        raise ValueError("value is not a valid email address")
    return v.lower()


Email = Annotated[str, AfterValidator(_validate_email)]
