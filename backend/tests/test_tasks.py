from tests.conftest import signup, auth_headers


def test_create_and_filter_tasks(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])

    client.post("/api/tasks", json={"title": "Fix bug", "priority": "high", "status": "todo"}, headers=headers)
    client.post("/api/tasks", json={"title": "Write docs", "priority": "low", "status": "backlog"}, headers=headers)

    resp = client.get("/api/tasks?priority=high", headers=headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Fix bug"


def test_task_title_blank_rejected(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    resp = client.post("/api/tasks", json={"title": "   "}, headers=headers)
    assert resp.status_code == 422


def test_update_task_status(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    task = client.post("/api/tasks", json={"title": "Fix bug"}, headers=headers).json()

    resp = client.patch(f"/api/tasks/{task['id']}", json={"status": "in_progress"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


def test_task_comment_flow(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])
    task = client.post("/api/tasks", json={"title": "Fix bug"}, headers=headers).json()

    resp = client.post(f"/api/tasks/{task['id']}/comments", json={"body": "on it"}, headers=headers)
    assert resp.status_code == 201

    resp = client.get(f"/api/tasks/{task['id']}/comments", headers=headers)
    assert len(resp.json()) == 1


def test_delete_task_requires_manager(client, db):
    from app.models.membership import RoleEnum
    from tests.conftest import add_member

    data = signup(client)
    headers = auth_headers(data["access_token"])
    task = client.post("/api/tasks", json={"title": "Fix bug"}, headers=headers).json()

    _, member_token = add_member(db, data["organization"]["id"], RoleEnum.member)
    resp = client.delete(f"/api/tasks/{task['id']}", headers=auth_headers(member_token))
    assert resp.status_code == 403

    resp = client.delete(f"/api/tasks/{task['id']}", headers=headers)
    assert resp.status_code == 204
