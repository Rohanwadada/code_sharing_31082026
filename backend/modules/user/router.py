from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.user.model import UserDetails
from modules.user.schema import UserResponse
from modules.user.service import UserService, get_user_service

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: UserDetails = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.get_user_details(user=user)
