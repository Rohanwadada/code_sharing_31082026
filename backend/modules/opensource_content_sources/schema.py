from pydantic import BaseModel


class ContentSource(BaseModel):
    name: str
    url: str
    topic: str
