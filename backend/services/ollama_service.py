import httpx
import time
from typing import Tuple, List, Optional
from backend.config import OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL

_last_check_time = 0.0
_cached_ollama_status: Tuple[bool, List[str]] = (False, [])

async def check_ollama_status(base_url: str = OLLAMA_BASE_URL, force: bool = False) -> Tuple[bool, List[str]]:
    """Checks if Ollama instance is alive and caches result for 20s to prevent pipeline lag."""
    global _last_check_time, _cached_ollama_status
    now = time.time()
    if not force and (now - _last_check_time < 20.0):
        return _cached_ollama_status

    try:
        async with httpx.AsyncClient(timeout=0.6) as client:
            resp = await client.get(f"{base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
                _cached_ollama_status = (True, models)
                _last_check_time = now
                return True, models
    except Exception:
        pass
    _cached_ollama_status = (False, [])
    _last_check_time = now
    return False, []

async def generate_ollama_response(
    prompt: str, 
    model: str = DEFAULT_OLLAMA_MODEL, 
    base_url: str = OLLAMA_BASE_URL,
    system_prompt: Optional[str] = None
) -> Optional[str]:
    """Generates text using local Ollama model. Returns None if Ollama is unreachable."""
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9
        }
    }
    if system_prompt:
        payload["system"] = system_prompt
        
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{base_url}/api/generate", json=payload)
            if resp.status_code == 200:
                res = resp.json().get("response", "").strip()
                if res:
                    return res
    except Exception:
        pass
    return None
