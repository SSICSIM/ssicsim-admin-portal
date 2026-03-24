from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="SSICSIM Admin Portal API",
        version="0.1.0",
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    # Serve local uploads if Supabase is not used
    app.mount(
        settings.upload_base_url,
        StaticFiles(directory=settings.upload_dir, check_dir=False),
        name="uploads",
    )
    return app


app = create_app()
