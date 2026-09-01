
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings, limiter

from app.routers import auth
from app.routers import jobs
from app.routers import dashboard
from app.routers import admin

from app.middleware import request_logging_middleware

app = FastAPI()



app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

app.middleware("http")(request_logging_middleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Routers
app.include_router(
    auth.router,
    prefix="/api",
    tags=["Auth"]
)

app.include_router(
    jobs.router,
    prefix="/api",
    tags=["Jobs"]
)

app.include_router(
    dashboard.router,
    prefix="/api",
    tags=["Dashboard"]
)

app.include_router(
    admin.router,
    prefix="/api",
    tags=["Admin"]
)


@app.get("/")
def root():
    return {
        "message": "TaskPulse API is running"
    }