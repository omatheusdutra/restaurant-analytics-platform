#!/usr/bin/env python3
"""API smoke tests (usable via pytest or as a script).

Usage with pytest:
  pytest -q scripts/test_api.py

Or run directly:
  python scripts/test_api.py
"""

from __future__ import annotations

import os
import time
import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")


def _call(method: str, path: str, **kwargs):
    url = f"{API_BASE_URL}{path}"
    return requests.request(method, url, timeout=30, **kwargs)


def test_api_endpoints():
    """End-to-end smoke test for health, auth and overview."""
    # Health
    r = _call("GET", "/health")
    assert r.status_code == 200, f"/health failed: {r.status_code} {r.text[:200]}"

    # Register (allow both 201 and 400 if email reused)
    email = f"test_{int(time.time())}@example.com"
    pwd = "Test123!@#"
    reg = _call(
        "POST",
        "/api/auth/register",
        json={"email": email, "password": pwd, "name": "Test User"},
    )
    assert reg.status_code in (201, 400), f"/api/auth/register: {reg.status_code} {reg.text[:200]}"

    # Login
    login = _call("POST", "/api/auth/login", json={"email": email, "password": pwd})
    assert login.status_code == 200, f"/api/auth/login: {login.status_code} {login.text[:200]}"
    token = login.json().get("token")
    assert token, "login did not return token"

    headers = {"Authorization": f"Bearer {token}"}

    # Overview
    ov = _call(
        "GET",
        "/api/metrics/overview?startDate=2025-05-01&endDate=2025-05-31",
        headers=headers,
    )
    assert ov.status_code == 200, f"/api/metrics/overview: {ov.status_code} {ov.text[:200]}"


if __name__ == "__main__":
    # Run as a simple script
    try:
        test_api_endpoints()
        print("All API smoke tests passed.")
    except AssertionError as e:
        print(f"Test failed: {e}")
        raise
