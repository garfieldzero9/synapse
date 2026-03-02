import OpenAI from 'openai';

/**
 * Factory function to create an OpenAI client configured for OpenRouter.
 * @param {string} apiKey - The user's OpenRouter API key from localStorage.
 * @returns {OpenAI} Configured OpenAI client instance.
 */
export function createOpenAIClient(apiKey) {
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            'HTTP-Referer': window.location.href,
            'X-Title': 'Synapse SaaS',
        },
    });
}
