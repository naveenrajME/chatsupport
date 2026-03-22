"""
Test token generator for chat widget integration testing.

Usage:
    cd "backend-python"
    source venv/bin/activate
    cd ..
    python generate_test_token.py

Copy the printed token and paste it into the TEST_TOKEN variable in:
    frontend/src/pages/ChatPage.jsx
"""

import sys
import os
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend-python", ".env"))

try:
    from jose import jwt
except ImportError:
    print("Error: python-jose not found. Activate the venv first:")
    print("  cd backend-python && source venv/bin/activate && cd ..")
    sys.exit(1)

SECRET_KEY = os.getenv("PARENT_APP_SECRET", "test_secret_key_change_this_in_production")

now_ms = int(time.time() * 1000)

payload = {
    "email_verified": True,
    "phone_number": "9876543210",   # change to your test phone
    "country_code": "IN",
    "not_before": now_ms,
    "not_after": now_ms + 300_000,  # valid for 5 minutes
    "first_name": "Naveen",         # change to your test name
    "last_name": "Raj",
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

print("\n✅ Test token generated (valid for 5 minutes):\n")
print(token)
print("\n📋 Paste this into frontend/src/pages/ChatPage.jsx:")
print(f'\nconst TEST_TOKEN = \'{token}\';\n')
