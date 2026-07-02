"""429 rate-limit responses must use the `{ok,data,error}` envelope like every error."""

from app.limits import limiter
from app.routers.community import SUBMISSION_RATE_LIMIT

SUBMISSIONS_URL = "/api/v1/community/submissions"


def _body() -> dict:
    return {"type": "memory", "payload": {"body": "ذكرى قصيرة من الفريج"}}


def test_rate_limited_response_uses_envelope(client):
    limit = int(SUBMISSION_RATE_LIMIT.split("/")[0])
    limiter.reset()
    try:
        for _ in range(limit):
            assert client.post(SUBMISSIONS_URL, json=_body()).status_code == 200
        res = client.post(SUBMISSIONS_URL, json=_body())
        assert res.status_code == 429
        assert res.json() == {"ok": False, "data": None, "error": "rate_limited"}
    finally:
        limiter.reset()  # never leak quota into other test modules
