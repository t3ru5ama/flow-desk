from app.models.membership import RoleEnum
from tests.conftest import signup, auth_headers, add_member


def test_viewer_cannot_create_project(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, viewer_token = add_member(db, org_id, RoleEnum.viewer)

    resp = client.post("/api/projects", json={"name": "New Project"}, headers=auth_headers(viewer_token))
    assert resp.status_code == 403


def test_member_cannot_create_project(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, member_token = add_member(db, org_id, RoleEnum.member)

    resp = client.post("/api/projects", json={"name": "New Project"}, headers=auth_headers(member_token))
    assert resp.status_code == 403


def test_manager_can_create_project(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, manager_token = add_member(db, org_id, RoleEnum.manager)

    resp = client.post("/api/projects", json={"name": "New Project"}, headers=auth_headers(manager_token))
    assert resp.status_code == 201


def test_viewer_cannot_create_task(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, viewer_token = add_member(db, org_id, RoleEnum.viewer)

    resp = client.post("/api/tasks", json={"title": "Do something"}, headers=auth_headers(viewer_token))
    assert resp.status_code == 403


def test_member_can_create_task(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, member_token = add_member(db, org_id, RoleEnum.member)

    resp = client.post("/api/tasks", json={"title": "Do something"}, headers=auth_headers(member_token))
    assert resp.status_code == 201


def test_non_admin_cannot_invite(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, manager_token = add_member(db, org_id, RoleEnum.manager)

    resp = client.post(
        f"/api/organizations/{org_id}/invites",
        json={"email": "new@acme.test", "role": "member"},
        headers=auth_headers(manager_token),
    )
    assert resp.status_code == 403


def test_admin_can_invite(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    _, admin_token = add_member(db, org_id, RoleEnum.admin)

    resp = client.post(
        f"/api/organizations/{org_id}/invites",
        json={"email": "new@acme.test", "role": "member"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201


def test_cannot_remove_last_owner(client):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_id = data["user"]["id"]

    resp = client.delete(
        f"/api/organizations/{org_id}/members/{owner_id}",
        headers=auth_headers(data["access_token"]),
    )
    assert resp.status_code == 409
