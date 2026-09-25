from fastapi import Depends, HTTPException, status

from app.deps import CurrentUser, get_current_user
from app.models.membership import RoleEnum

ROLE_RANK = {
    RoleEnum.viewer: 0,
    RoleEnum.member: 1,
    RoleEnum.manager: 2,
    RoleEnum.admin: 3,
    RoleEnum.owner: 4,
}


def require_role(*roles: RoleEnum):
    """Dependency factory: current membership role must be one of `roles`
    (or outrank the lowest of them), else 403."""
    min_rank = min(ROLE_RANK[r] for r in roles)

    def checker(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if ROLE_RANK[current.role] < min_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this action",
            )
        return current

    return checker
