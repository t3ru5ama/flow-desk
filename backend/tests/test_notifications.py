from app.models.membership import RoleEnum
from tests.conftest import signup, auth_headers, add_member


def test_task_assignment_triggers_notification(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    assignee, assignee_token = add_member(db, org_id, RoleEnum.member, email="assignee@acme.test")

    client.post(
        "/api/tasks", json={"title": "Fix bug", "assignee_id": assignee.id}, headers=owner_headers,
    )

    resp = client.get("/api/notifications/unread-count", headers=auth_headers(assignee_token))
    assert resp.json()["unread_count"] == 1

    notifications = client.get("/api/notifications", headers=auth_headers(assignee_token)).json()
    assert notifications["items"][0]["type"] == "task_assigned"


def test_mark_notification_read(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    assignee, assignee_token = add_member(db, org_id, RoleEnum.member, email="assignee@acme.test")

    client.post("/api/tasks", json={"title": "Fix bug", "assignee_id": assignee.id}, headers=owner_headers)
    notification_id = client.get("/api/notifications", headers=auth_headers(assignee_token)).json()["items"][0]["id"]

    resp = client.patch(f"/api/notifications/{notification_id}/read", headers=auth_headers(assignee_token))
    assert resp.status_code == 204

    resp = client.get("/api/notifications/unread-count", headers=auth_headers(assignee_token))
    assert resp.json()["unread_count"] == 0


def test_mark_all_read(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    assignee, assignee_token = add_member(db, org_id, RoleEnum.member, email="assignee@acme.test")

    for i in range(3):
        client.post("/api/tasks", json={"title": f"Task {i}", "assignee_id": assignee.id}, headers=owner_headers)

    client.patch("/api/notifications/read-all", headers=auth_headers(assignee_token))
    resp = client.get("/api/notifications/unread-count", headers=auth_headers(assignee_token))
    assert resp.json()["unread_count"] == 0
