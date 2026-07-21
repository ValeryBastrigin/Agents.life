"""
SSE streaming helper for specialized agents.
Provides base streaming infrastructure so that agents can yield tokens
in real time as the LLM generates them, instead of waiting for the full response.
"""

from __future__ import annotations

import json
import asyncio
from typing import AsyncGenerator, Protocol, Any, Callable, Coroutine
from dataclasses import dataclass, field
from src.config import client


# ─── SSE Event Types ────────────────────────────────────────────────────────────

@dataclass
class StreamEvent:
    """Represents a single SSE event in the streaming pipeline."""
    type: str  # "token", "widget", "done", "error"
    content: str
    metadata: dict = field(default_factory=dict)


def token_event(content: str) -> str:
    """SSE data string for a text token."""
    return f"data: {json.dumps({'type': 'token', 'content': content}, ensure_ascii=False)}\n\n"


def widget_event(widget_type: str, payload: dict) -> str:
    """SSE data string for a widget (JSON structure)."""
    return f"data: {json.dumps({'type': 'widget', 'widget_type': widget_type, **payload}, ensure_ascii=False)}\n\n"


def done_event(response: str, tokens_used: int) -> str:
    """SSE data string signalling end of stream."""
    return f"data: {json.dumps({'type': 'done', 'content': response, 'tokens_used': tokens_used}, ensure_ascii=False)}\n\n"


def error_event(message: str) -> str:
    """SSE data string for an error."""
    return f"data: {json.dumps({'type': 'error', 'content': message}, ensure_ascii=False)}\n\n"


# ─── Agent Stream Protocol ──────────────────────────────────────────────────────

class AgentStreamProtocol(Protocol):
    """
    Protocol that a streaming-capable agent must implement.
    Instead of returning (response_text, tokens_used), the agent yields
    StreamEvent objects and the orchestrator translates them into SSE frames.
    """

    async def process_stream(
        self,
        message: str,
        system_prompt: str,
        db: Any,
        user_id: int,
        attachments: list[dict] | None = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Async generator that yields StreamEvent items."""
        ...


def agent_has_stream(agent_module: object) -> bool:
    """Check if an agent module has a process_stream async generator."""
    return hasattr(agent_module, "process_stream") and asyncio.iscoroutinefunction(
        getattr(agent_module, "process_stream", None)
    )


# ─── Real LLM Streaming (native SSE) ────────────────────────────────────────────

async def _iter_llm_stream(stream):
    """
    Iterate over an OpenAI-style streaming response.
    Yields individual tokens as they arrive.

    Works with both async and sync streaming iterators.
    Uses AsyncOpenAI (async) client by default, with sync fallback.

    Args:
        stream: The return value of client.chat.completions.create(stream=True, ...)

    Yields:
        str: Each token chunk
    """
    try:
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
    except (AttributeError, TypeError):
        # Sync iterator fallback (some clients return sync iterators)
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
    except Exception:
        # Last resort: try synchronous iteration
        try:
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            print(f"[streaming] Failed to iterate stream: {e}")
            raise


async def stream_llm_response(
    client: Any,
    model: str,
    messages: list[dict],
    temperature: float = 0.5,
    max_tokens: int = 3000,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Make a streaming LLM call and yield token events in REAL TIME.

    Also accumulates the full response text and returns it
    via a 'done' event at the end.

    Yields:
        StreamEvent items with type "token" or "done".
    """
    full_response = ""
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in _iter_llm_stream(stream):
            full_response += chunk
            yield StreamEvent(type="token", content=chunk)

        yield StreamEvent(
            type="done",
            content=full_response,
            metadata={"tokens_used": 0},
        )
    except Exception as e:
        print(f"[streaming] LLM stream error: {e}")
        yield StreamEvent(
            type="error",
            content=f"Извините, произошла ошибка при генерации ответа: {e}",
        )


# ─── Universal streaming wrapper for agents ─────────────────────────────────────

async def agent_stream_wrapper(
    llm_call_coro: Coroutine[Any, Any, str],
) -> AsyncGenerator[StreamEvent, None]:
    """
    Universal wrapper that processes an LLM call result and streams it as SSE.

    Args:
        llm_call_coro: A coroutine that returns the full response text (from agent's business logic)

    Yields:
        StreamEvent items with type "token", "widget", or "done".
    """
    try:
        response_text = await llm_call_coro
    except Exception as e:
        print(f"[streaming::wrap] process error: {e}")
        yield StreamEvent(
            type="error",
            content=f"Извините, произошла ошибка при обработке запроса: {e}",
        )
        return

    if response_text is None:
        response_text = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз."

    # Check if response is JSON (widget)
    try:
        parsed = json.loads(response_text)
        if isinstance(parsed, dict) and ('type' in parsed or 'meals' in parsed or 'widget_type' in parsed):
            yield StreamEvent(type="widget", content=response_text)
            yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return
    except json.JSONDecodeError:
        pass

    # Check if response contains mixed widget+text (e.g. JSON + \n\n + text)
    if response_text.startswith('{'):
        try:
            first_brace = response_text.index('}')
            potential_json = response_text[:first_brace+1]
            parsed = json.loads(potential_json)
            if isinstance(parsed, dict) and ('type' in parsed or 'meals' in parsed):
                yield StreamEvent(type="widget", content=potential_json)
                rest = response_text[first_brace+1:].strip()
                if rest:
                    # Stream remaining text as tokens
                    words = rest.split(' ')
                    for i, word in enumerate(words):
                        chunk = word + (' ' if i < len(words) - 1 else '')
                        yield StreamEvent(type="token", content=chunk)
                yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                return
        except (json.JSONDecodeError, ValueError):
            pass

    # Split text into chunks (words) and stream them in real time
    words = response_text.split(' ')
    for i, word in enumerate(words):
        chunk = word + (' ' if i < len(words) - 1 else '')
        yield StreamEvent(type="token", content=chunk)

    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})


# ─── Text streaming with delay (for emulating real-time streaming) ─────────────

async def stream_text_with_delay(
    text: str,
    chunk_size: int = 1,
    delay_ms: int = 30,
) -> AsyncGenerator[str, None]:
    """
    Stream text in chunks with a small delay between chunks.
    Used to emulate real-time streaming when we have pre-generated text.
    
    Args:
        text: The full text to stream
        chunk_size: Number of characters per chunk (default: 1 for character-by-character)
        delay_ms: Delay between chunks in milliseconds (default: 30ms)
    
    Yields:
        str: Each chunk of text
    """
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        yield chunk
        if i + chunk_size < len(text):  # Don't delay after the last chunk
            await asyncio.sleep(delay_ms / 1000)


# ─── SSE Formatting ─────────────────────────────────────────────────────────────

def stream_event_to_sse(event: StreamEvent) -> str:
    """Convert a StreamEvent to an SSE-formatted string."""
    payload = {"type": event.type, "content": event.content}
    payload.update(event.metadata)
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"