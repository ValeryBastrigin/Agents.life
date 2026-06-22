def process(message: str, system_prompt: str) -> tuple[str, int]:
    """
    Process message with Accountant agent.
    Returns: (response_text, tokens_used)
    """
    # Simple response logic for MVP
    # In production, this would call an LLM API
    
    response = f"Accountant: I've received your message: '{message}'. As your accountant, I can help you with budgeting, expense tracking, and financial planning. What financial assistance do you need?"
    
    # Estimate tokens (rough approximation: 4 chars per token)
    tokens_used = max(10, len(response) // 4)
    
    return response, tokens_used
