/**
 * The Groq model used for summarising and judging news, and for the chat assistant.
 *
 * It is read when needed, not at import: this module is evaluated before
 * dotenv.config() runs in index.js, so a top-level read of process.env would miss
 * the value in .env.
 *
 * The previous hard-coded model (llama-3.3-70b-versatile) was retired by Groq and
 * every call answered 404 model_not_found. The agent swallowed the error and fell
 * back to raw feed snippets, so the AI step had silently not worked at all. Keep
 * the model an environment setting so the next retirement is a config change; list
 * what the account can use with `GET https://api.groq.com/openai/v1/models`.
 */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b'

export const groqModel = () => process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL

/** gpt-oss models reason before answering; a low effort keeps short classification tasks fast and cheap. */
export const reasoningParams = (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
