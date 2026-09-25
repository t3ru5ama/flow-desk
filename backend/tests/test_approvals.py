from app.models.membership import RoleEnum
from tests.conftest import signup, auth_headers, add_member


def test_sequential_steps_any_approver_satisfies(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    approver1, token1 = add_member(db, org_id, RoleEnum.manager, email="a1@acme.test")
    approver2, token2 = add_member(db, org_id, RoleEnum.manager, email="a2@acme.test")

    approval = client.post(
        "/api/approvals",
        json={"title": "Deploy", "steps": [{"approver_ids": [approver1.id]}, {"approver_ids": [approver2.id]}]},
        headers=owner_headers,
    ).json()
    assert approval["status"] == "pending"
    assert approval["current_step_order"] == 1

    step1_id = approval["steps"][0]["id"]
    resp = client.post(
        f"/api/approvals/{approval['id']}/steps/{step1_id}/decide",
        json={"decision": "approved", "comment": "looks good"},
        headers=auth_headers(token1),
    )
    body = resp.json()
    assert body["status"] == "pending"
    assert body["current_step_order"] == 2

    step2_id = approval["steps"][1]["id"]
    resp = client.post(
        f"/api/approvals/{approval['id']}/steps/{step2_id}/decide",
        json={"decision": "approved"},
        headers=auth_headers(token2),
    )
    assert resp.json()["status"] == "approved"


def test_rejection_kills_chain_and_skips_later_steps(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    approver1, token1 = add_member(db, org_id, RoleEnum.manager, email="a1@acme.test")
    approver2, _ = add_member(db, org_id, RoleEnum.manager, email="a2@acme.test")

    approval = client.post(
        "/api/approvals",
        json={"title": "Deploy", "steps": [{"approver_ids": [approver1.id]}, {"approver_ids": [approver2.id]}]},
        headers=owner_headers,
    ).json()

    step1_id = approval["steps"][0]["id"]
    resp = client.post(
        f"/api/approvals/{approval['id']}/steps/{step1_id}/decide",
        json={"decision": "rejected", "comment": "not ready"},
        headers=auth_headers(token1),
    )
    body = resp.json()
    assert body["status"] == "rejected"
    assert body["steps"][1]["status"] == "skipped"


def test_reject_without_comment_rejected_422(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    approver1, token1 = add_member(db, org_id, RoleEnum.manager, email="a1@acme.test")

    approval = client.post(
        "/api/approvals", json={"title": "Deploy", "steps": [{"approver_ids": [approver1.id]}]}, headers=owner_headers,
    ).json()
    step1_id = approval["steps"][0]["id"]

    resp = client.post(
        f"/api/approvals/{approval['id']}/steps/{step1_id}/decide",
        json={"decision": "rejected"},
        headers=auth_headers(token1),
    )
    assert resp.status_code == 422


def test_non_approver_cannot_decide(client, db):
    data = signup(client)
    org_id = data["organization"]["id"]
    owner_headers = auth_headers(data["access_token"])
    approver1, _ = add_member(db, org_id, RoleEnum.manager, email="a1@acme.test")
    _, other_token = add_member(db, org_id, RoleEnum.manager, email="a2@acme.test")

    approval = client.post(
        "/api/approvals", json={"title": "Deploy", "steps": [{"approver_ids": [approver1.id]}]}, headers=owner_headers,
    ).json()
    step1_id = approval["steps"][0]["id"]

    resp = client.post(
        f"/api/approvals/{approval['id']}/steps/{step1_id}/decide",
        json={"decision": "approved"},
        headers=auth_headers(other_token),
    )
    assert resp.status_code == 403
