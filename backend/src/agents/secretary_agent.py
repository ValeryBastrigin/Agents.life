def process(message: str, system_prompt: str) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    """
    # Simple response logic for MVP
    # In production, this would call an LLM API
    
    response = f"Secretary: I've received your message: '{message}'. As your secretary, I can help you with scheduling, reminders, and organization tasks. How can I assist you today?"
    
    # Estimate tokens (rough approximation: 4 chars per token)
    tokens_used = max(10, len(response) // 4)
    
    return response, tokens_used
