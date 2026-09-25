import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.config import settings

logger = logging.getLogger("flowdesk")
from app.core.rate_limit import limiter
from app.routers import (
    approvals,
    audit,
    auth,
    billing,
    dev,
    documents,
    incidents,
    integrations,
    notifications,
    organizations,
    projects,
    tasks,
    users,
)

app = FastAPI(title="FlowDesk API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(organizations.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(incidents.router)
app.include_router(approvals.router)
app.include_router(documents.router)
app.include_router(notifications.router)
app.include_router(integrations.router)
app.include_router(billing.router)
app.include_router(audit.router)
app.include_router(dev.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    if settings.debug:
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
