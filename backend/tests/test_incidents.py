from tests.conftest import signup, auth_headers


def test_incident_lifecycle_writes_events(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])

    incident = client.post(
        "/api/incidents", json={"title": "DB down", "severity": "sev1"}, headers=headers,
    ).json()

    resp = client.patch(f"/api/incidents/{incident['id']}", json={"status": "investigating"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "investigating"

    resp = client.patch(f"/api/incidents/{incident['id']}", json={"status": "resolved"}, headers=headers)
    assert resp.json()["resolved_at"] is not None

    events = client.get(f"/api/incidents/{incident['id']}/events", headers=headers).json()
    event_types = [e["event_type"] for e in events]
    assert event_types == ["created", "status_changed", "status_changed"]


def test_incident_cannot_move_backward(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])

    incident = client.post(
        "/api/incidents", json={"title": "DB down", "severity": "sev1", "status": "monitoring"}, headers=headers,
    ).json()
    client.patch(f"/api/incidents/{incident['id']}", json={"status": "monitoring"}, headers=headers)

    resp = client.patch(f"/api/incidents/{incident['id']}", json={"status": "detected"}, headers=headers)
    assert resp.status_code == 422


def test_incident_comment_and_task_link(client):
    data = signup(client)
    headers = auth_headers(data["access_token"])

    incident = client.post("/api/incidents", json={"title": "DB down", "severity": "sev2"}, headers=headers).json()
    task = client.post("/api/tasks", json={"title": "Investigate DB"}, headers=headers).json()

    resp = client.post(f"/api/incidents/{incident['id']}/comments", json={"body": "investigating now"}, headers=headers)
    assert resp.status_code == 201

    resp = client.post(f"/api/incidents/{incident['id']}/tasks", json={"task_id": task["id"]}, headers=headers)
    assert resp.status_code == 204

    events = client.get(f"/api/incidents/{incident['id']}/events", headers=headers).json()
    event_types = [e["event_type"] for e in events]
    assert "comment_added" in event_types
    assert "task_linked" in event_types
