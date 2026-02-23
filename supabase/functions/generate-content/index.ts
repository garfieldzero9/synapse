

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { rawText, ideaId, type, openRouterKey } = await req.json()

        // 1. Validate Input
        if (!rawText || !ideaId) {
            return new Response(JSON.stringify({ error: 'Missing rawText or ideaId' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 2. Call OpenRouter API
        if (!openRouterKey) throw new Error("Missing openRouterKey in request body")

        const systemPromptLinkedIn = "You are a world-class content strategist and copywriter. Convert the user's messy brain dump into a highly engaging, professional LinkedIn post.\n\nCRITICAL RULE: Output ONLY the raw post text. Do NOT include any conversational filler like 'Here is your post' or 'Let me know if'. Do NOT wrap it in quotes."
        const systemPromptTwitter = "You are a world-class ghostwriter. Convert the user's messy brain dump into a highly engaging, viral 5-part Twitter thread.\n\nCRITICAL RULE: Output exactly 5 tweets. Separate each tweet with a blank line. Do NOT include labels like 'Thread Title:', 'Post 1:', or 'Tweet 1:'. Do NOT include any introductions, conclusions, or conversational filler. Start the very first tweet immediately."

        const fetchOpenRouter = async (prompt: string) => {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'HTTP-Referer': 'https://synapse.garfieldzero9.dev/',
                    'X-Title': 'Synapse',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'liquid/lfm-2.5-1.2b-instruct:free',
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: rawText }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error?.message || "OpenRouter error")
            return data.choices[0].message.content
        }

        const [linkedinContent, twitterContent] = await Promise.all([
            fetchOpenRouter(systemPromptLinkedIn),
            fetchOpenRouter(systemPromptTwitter)
        ])



        // Example of inserting the result into the table directly from the Edge function
        // For this MVP, we will mostly rely on returning the text to the frontend and letting frontend handle view update.

        // Ensure the generated result is returned to the user
        return new Response(JSON.stringify({ linkedin: linkedinContent, twitter: twitterContent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
