import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import (
    DUMMY_HASH,
    create_access_token,
    create_reset_token,
    decode_token,
    hash_password,
    reset_token_matches_user,
    verify_password,
)
from app.config import get_settings
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import Message
from app.schemas.user import (
    ForgotPassword,
    PasswordChange,
    ResetPassword,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("jobtrack")
settings = get_settings()

EMAIL_TAKEN = "An account with this email already exists."


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenOut:
    if _find_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_TAKEN)
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenOut:
    user = _find_user_by_email(db, payload.email)
    # Always run one bcrypt comparison so the response time does not reveal whether the email exists.
    password_ok = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    existing = _find_user_by_email(db, payload.email)
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_TAKEN)
    current_user.full_name = payload.full_name
    current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=Message)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Message:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Your current password is incorrect."
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please choose a new password that is different from the current one.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Message(message="Your password has been updated.")


@router.post("/forgot-password", response_model=Message)
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)) -> Message:
    """Start a password reset.

    JobTrack has no email service, so the reset link is written to the backend console. The
    response is identical whether or not the email exists, so it cannot be used to find accounts.
    """
    user = _find_user_by_email(db, payload.email.lower())
    if user:
        link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={create_reset_token(user)}"
        logger.warning("Password reset requested for %s. Reset link (valid 30 minutes): %s", user.email, link)
        print(f"\n[JobTrack] Password reset link for {user.email}:\n{link}\n", flush=True)
    return Message(
        message="If an account exists for that email, a reset link has been generated. "
        "Check the backend console for the link."
    )


@router.post("/reset-password", response_model=Message)
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)) -> Message:
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This reset link is invalid or has expired. Please request a new one.",
    )
    data = decode_token(payload.token, purpose="reset")
    if data is None:
        raise invalid
    user = db.get(User, int(data["sub"]))
    if user is None or not reset_token_matches_user(data, user):
        raise invalid
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Message(message="Your password has been reset. You can now sign in.")
