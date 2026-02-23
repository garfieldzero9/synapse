# Edge Function Deployment Guide

The AI backend logic is perfectly set up! To make the frontend "Make Magic" button work, we need to deploy the Edge Function to your live Supabase project and give it your OpenAI key.

Please follow these steps in your terminal:

**1. Set your OpenRouter API Key as a Supabase Secret**
Get a free API key from [OpenRouter](https://openrouter.ai/).
Run this command, replacing `your_actual_api_key_here` with your real OpenRouter API Key:
```bash
npx supabase secrets set OPENROUTER_API_KEY=your_actual_api_key_here
```

**2. Deploy the Edge Function**
Run this command to push the local function we just wrote to the cloud:
```bash
npx supabase functions deploy generate-content --no-verify-jwt
```

*(Note: If you run into linking errors, ensure you've linked your project first by running `npx supabase link --project-ref your-project-id`)*

**3. Test It Out!**
Once deployed, go back to your app at `http://localhost:5174/app.html`, type a raw thought, and hit **Make Magic**. You should see a real AI-generated output!

Let me know once you have deployed the function!
