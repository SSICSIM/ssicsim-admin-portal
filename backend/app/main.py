from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import settings

_PROD = os.getenv("ENVIRONMENT", "development") == "production"


def create_app() -> FastAPI:
    app = FastAPI(
        title="SSICSIM Admin Portal API",
        version="0.1.0",
        # Docs and schema are hidden in production so the API surface isn't
        # publicly discoverable. Set ENVIRONMENT=production on Render.
        openapi_url=None if _PROD else "/openapi.json",
        docs_url=None if _PROD else "/docs",
        redoc_url=None if _PROD else "/redoc",
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
