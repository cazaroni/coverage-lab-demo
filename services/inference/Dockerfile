FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
COPY README.md ./
COPY src ./src
COPY bundle ./bundle

RUN pip install --no-cache-dir .

ENV INFERENCE_BUNDLE_ROOT=/app/bundle

CMD ["uvicorn", "projectedge_inference.app:app", "--host", "0.0.0.0", "--port", "3001"]

