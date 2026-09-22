FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home pulse
COPY app ./app
USER 10001
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--ws-max-size", "16384", "--timeout-graceful-shutdown", "20", "--no-access-log", "--log-level", "warning"]
