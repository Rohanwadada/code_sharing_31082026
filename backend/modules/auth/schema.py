from pydantic import BaseModel, EmailStr


class SendOTPRequest(BaseModel):
    email: EmailStr


class SendOTPResponse(BaseModel):
    challenge_id: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    challenge_id: str


class VerifyOTPResponse(BaseModel):
    status: str
