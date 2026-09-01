import time

from fastapi import Request


async def request_logging_middleware(request: Request, call_next):
    # Record when the request starts
    start_time = time.perf_counter()

    # Let FastAPI process the request
    response = await call_next(request)

    # Calculate response time
    end_time = time.perf_counter()
    response_time = end_time - start_time

    # Log request details
    print(
        f"{request.method} "
        f"{request.url.path} "
        f"{response.status_code} "
        f"{response_time:.4f}s"
    )

    return response