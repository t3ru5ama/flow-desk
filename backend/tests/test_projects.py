from tests.conftest import signup, auth_headers


def test_create_and_get_project(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])

    resp = client.post("/api/projects", json={"name": "Platform Migration", "priority": "high"}, headers=headers)
    assert resp.status_code == 201
    project = resp.json()
    assert project["name"] == "Platform Migration"

    resp = client.get(f"/api/projects/{project['id']}", headers=headers)
    assert resp.status_code == 200


def test_list_projects_filters_by_status(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    client.post("/api/projects", json={"name": "A", "status": "active"}, headers=headers)
    client.post("/api/projects", json={"name": "B", "status": "on_hold"}, headers=headers)

    resp = client.get("/api/projects?status=on_hold", headers=headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "B"


def test_update_project(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    project = client.post("/api/projects", json={"name": "A"}, headers=headers).json()

    resp = client.patch(f"/api/projects/{project['id']}", json={"priority": "critical"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["priority"] == "critical"


def test_archive_project_is_soft_delete(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    project = client.post("/api/projects", json={"name": "A"}, headers=headers).json()

    resp = client.delete(f"/api/projects/{project['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "archived"


def test_due_date_before_start_date_rejected(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    resp = client.post(
        "/api/projects",
        json={"name": "A", "start_date": "2026-06-01", "due_date": "2026-05-01"},
        headers=headers,
    )
    assert resp.status_code == 422
