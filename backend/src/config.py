import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("ROUTER_API_KEY"),
    base_url="https://routerai.ru/api/v1"
)
