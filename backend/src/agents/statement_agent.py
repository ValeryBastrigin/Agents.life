"""
Agent for processing bank statements using LLM.
Extracts transactions, categories, income/expense from raw text.
Supports chunking large statements into parts.
"""
import json
import re
import os
from src.config import client

# Модель для выписок — можно задать через переменную окружения STATEMENT_MODEL
# По умолчанию google/gemini-2.5-flash-lite — лёгкая текстовая модель
STATEMENT_MODEL = os.getenv("STATEMENT_MODEL", "google/gemini-2.5-flash-lite")

SYSTEM_PROMPT = """Ты — финансовый аналитик Ixteria. Твоя задача — проанализировать банковскую выписку пользователя и извлечь из неё структурированные данные.

Проанализируй выписку и верни ТОЛЬКО JSON в следующем формате (без markdown, без пояснений):

{
  "bank_name": "Название банка (если указано, иначе пустая строка)",
  "period": {
    "start": "YYYY-MM-DD или null",
    "end": "YYYY-MM-DD или null"
  },
  "total_income": 0.0,
  "total_expense": 0.0,
  "categories": {
    "category_name": {
      "description": "Описание категории",
      "income": 0.0,
      "expense": 0.0,
      "count": 0
    }
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD или null",
      "description": "Описание операции",
      "amount": 0.0,
      "type": "income или expense",
      "category": "категория"
    }
  ],
  "analysis": "Краткий текстовый анализ финансового состояния: ключевые траты, рекомендации, слабые места (2-3 предложения на русском)"
}

Категории должны быть осмысленными: Продукты, Транспорт, Жильё, Коммунальные услуги, Развлечения, Здоровье, Одежда, Связь, Образование, Доход (зарплата), Доход (подработка), Переводы, Прочее и т.д.

Если данных в выписке мало, заполни тем, что сможешь извлечь."""
BANK_STATEMENT_SYSTEM_PROMPT = SYSTEM_PROMPT  # alias for import

CHUNK_SIZE = 5000  # символов на чанк


def _split_into_chunks(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    """Split text into roughly equal chunks by character count, splitting at line breaks."""
    if len(text) <= chunk_size:
        return [text]
    
    lines = text.split('\n')
    chunks = []
    current_chunk = []
    current_size = 0
    
    for line in lines:
        line_len = len(line) + 1  # +1 for newline
        if current_size + line_len > chunk_size and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_size = line_len
        else:
            current_chunk.append(line)
            current_size += line_len
    
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks


async def _call_llm(chunk_text: str, is_summary: bool = False) -> tuple[dict, int, int]:
    """Call LLM with a chunk of text and return (parsed_json, input_tokens, output_tokens)."""
    if is_summary:
        prompt = f"""Вот итоговый фрагмент банковской выписки. Извлеки все финансовые транзакции из этого фрагмента:

{chunk_text}

Верни JSON строго по схеме, указанной в system prompt. Никакого markdown, только чистый JSON."""
    else:
        prompt = f"""Проанализируй этот фрагмент банковской выписки и извлеки все финансовые транзакции.

{chunk_text}

Верни JSON строго по схеме, указанной в system prompt. Никакого markdown, только чистый JSON."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    response = await client.chat.completions.create(
        model=STATEMENT_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=8000,
        timeout=180.0
    )

    # Get actual token usage from response
    tokens_in = response.usage.prompt_tokens if response.usage else 0
    tokens_out = response.usage.completion_tokens if response.usage else 0

    response_text = response.choices[0].message.content.strip()
    
    # Clean markdown code blocks if present
    response_text = re.sub(r'^```(?:json)?\s*', '', response_text)
    response_text = re.sub(r'\s*```$', '', response_text)
    response_text = response_text.strip()
    
    result = json.loads(response_text)
    return result, tokens_in, tokens_out


def _extract_json(text: str) -> dict | None:
    """Try to extract JSON from text by finding { ... } block."""
    try:
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    return None


def _empty_result() -> dict:
    """Return empty result structure."""
    return {
        "bank_name": "",
        "period": {"start": None, "end": None},
        "total_income": 0.0,
        "total_expense": 0.0,
        "categories": {},
        "transactions": [],
        "analysis": "Не удалось обработать выписку. Попробуйте загрузить файл в другом формате."
    }


async def process_statement_chunk(chunk_text: str, previous_result: dict = None) -> tuple[dict, int, int]:
    """
    Process a bank statement text with LLM.
    For large texts, automatically splits into chunks and merges results.
    
    Returns:
        Tuple of (merged_result, total_input_tokens, total_output_tokens)
    """
    try:
        # Split into chunks if text is too large
        chunks = _split_into_chunks(chunk_text)
        
        if len(chunks) == 1:
            # Single chunk - process directly
            result, tokens_in, tokens_out = await _call_llm(chunks[0])
            return result, tokens_in, tokens_out
        
        # Multiple chunks - process each and merge
        print(f"Splitting statement into {len(chunks)} chunks")
        chunk_results = []
        total_tokens_in = 0
        total_tokens_out = 0
        
        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)} ({len(chunk)} chars)")
            try:
                result, tokens_in, tokens_out = await _call_llm(chunk)
                chunk_results.append(result)
                total_tokens_in += tokens_in
                total_tokens_out += tokens_out
            except Exception as e:
                print(f"Error processing chunk {i+1}: {e}")
                # Continue with other chunks even if one fails
                continue
        
        if not chunk_results:
            return _empty_result(), 0, 0
        
        # Merge results
        merged = merge_results(chunk_results)
        return merged, total_tokens_in, total_tokens_out
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error in statement agent: {e}")
        # Fallback: try to extract JSON from response if possible
        try:
            result = _extract_json(locals().get('response_text', ''))
            if result:
                return result, 0, 0
        except:
            pass
        return _empty_result(), 0, 0
    except Exception as e:
        print(f"Error in statement agent: {e}")
        return _empty_result(), 0, 0


def merge_results(results: list[dict]) -> dict:
    """Merge multiple chunk results into one."""
    if not results:
        return _empty_result()
    
    merged = {
        "bank_name": results[0].get("bank_name", "") if results else "",
        "period": {"start": None, "end": None},
        "total_income": 0.0,
        "total_expense": 0.0,
        "categories": {},
        "transactions": [],
        "analysis": ""
    }
    
    all_periods = []
    all_analyses = []
    
    for r in results:
        # Period
        period = r.get("period", {})
        if period.get("start"):
            all_periods.append(period["start"])
        if period.get("end"):
            all_periods.append(period["end"])
        
        # Totals
        merged["total_income"] += r.get("total_income", 0)
        merged["total_expense"] += r.get("total_expense", 0)
        
        # Categories
        for cat_name, cat_data in r.get("categories", {}).items():
            if cat_name not in merged["categories"]:
                merged["categories"][cat_name] = {
                    "description": cat_data.get("description", ""),
                    "income": 0.0,
                    "expense": 0.0,
                    "count": 0
                }
            merged["categories"][cat_name]["income"] += cat_data.get("income", 0)
            merged["categories"][cat_name]["expense"] += cat_data.get("expense", 0)
            merged["categories"][cat_name]["count"] += cat_data.get("count", 0)
        
        # Transactions
        merged["transactions"].extend(r.get("transactions", []))
        
        # Analysis
        if r.get("analysis"):
            all_analyses.append(r["analysis"])
    
    # Finalize period
    if all_periods:
        merged["period"]["start"] = min(all_periods) if all_periods else None
        merged["period"]["end"] = max(all_periods) if all_periods else None
    
    # Combine bank name if multiple
    bank_names = set(r.get("bank_name", "") for r in results if r.get("bank_name"))
    if bank_names:
        merged["bank_name"] = " / ".join(bank_names)
    
    # Combine analysis
    if all_analyses:
        merged["analysis"] = " ".join(all_analyses)
    
    return merged
