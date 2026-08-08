import httpx, asyncio

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://localhost:8000/auth/google", follow_redirects=False)
        print(f"Status: {r.status_code}")
        print(f"Location: {r.headers.get('location', 'none')}")

asyncio.run(test())