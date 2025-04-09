from pydantic import BaseModel


class ModelViewResponse(BaseModel):
    modelId: str
    name: str
    description: str
    languages: list[str]
    domain: str
    submitter: str
    license: str
    inferenceEndPoint: str
    source: str
    task: str 