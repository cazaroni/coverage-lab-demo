FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/services/api

WORKDIR /app

COPY packages/analytics /app/packages/analytics
COPY packages/proto /app/packages/proto
COPY packages/schemas /app/packages/schemas
COPY services/api /app/services/api

RUN pip install -e /app/packages/analytics \
    && if [ -f /app/packages/proto/pyproject.toml ]; then pip install -e /app/packages/proto; fi \
    && if [ -f /app/packages/schemas/pyproject.toml ]; then pip install -e /app/packages/schemas; fi \
    && pip install -e /app/services/api

EXPOSE 8000

WORKDIR /app/services/api

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

