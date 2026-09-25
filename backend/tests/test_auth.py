from tests.conftest import signup, auth_headers


def test_signup_creates_org_and_returns_tokens(client):
    data = signup(client)
    assert data["user"]["email"] == "alex@acme.test"
    assert data["organization"]["name"] == "Acme Technologies"
    assert "access_token" in data


def test_signup_duplicate_email_conflicts(client):
    signup(client)
    resp = client.post(
        "/api/auth/signup",
        json={"name": "Someone Else", "email": "alex@acme.test", "password": "Password123!", "organization_name": "Other Org"},
    )
    assert resp.status_code == 409


def test_login_correct_password(client):
    signup(client)
    resp = client.post("/api/auth/login", json={"email": "alex@acme.test", "password": "Password123!"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_incorrect_password(client):
    signup(client)
    resp = client.post("/api/auth/login", json={"email": "alex@acme.test", "password": "WrongPassword1"})
    assert resp.status_code == 401


def test_refresh_issues_new_access_token(client):
    signup(client)
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_logout_revokes_refresh_token(client):
    data = signup(client)
    client.post("/api/auth/logout", headers=auth_headers(data["access_token"]))
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 401


def test_forgot_password_and_reset_flow(client):
    signup(client)
    resp = client.post("/api/auth/forgot-password", json={"email": "alex@acme.test"})
    assert resp.status_code == 204

    link_info = client.get("/api/dev/last-email").json()
    token = link_info["link"].split("token=")[1]

    resp = client.post("/api/auth/reset-password", json={"token": token, "password": "NewPassword1"})
    assert resp.status_code == 204

    resp = client.post("/api/auth/login", json={"email": "alex@acme.test", "password": "NewPassword1"})
    assert resp.status_code == 200


def test_forgot_password_unknown_email_does_not_leak(client):
    resp = client.post("/api/auth/forgot-password", json={"email": "nobody@acme.test"})
    assert resp.status_code == 204
