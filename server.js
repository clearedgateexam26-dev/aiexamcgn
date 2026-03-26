require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Determine if we are running in a 'backend' folder or root
const isInsideBackend = __dirname.endsWith('backend');
const frontendPath = isInsideBackend 
    ? path.join(__dirname, '..', 'frontend') 
    : path.join(__dirname, 'frontend');

// 2. Serve Static Files
app.use(express.static(frontendPath));

// 3. GitHub Models Init
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, 
});

// 4. API Route
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";
    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "Return ONLY a raw JSON array. No markdown." },
                { role: "user", content: `Generate 10 MCQs for ${topic}. Format: [{"q":"text","options":["A","B","C","D"],"correct":0,"explanation":"text"}]` }
            ],
            model: "gpt-4o", 
        });

        const text = response.choices[0].message.content.replace(/```json|```/gi, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: "AI Failed to generate" });
    }
});

/** * 5. THE ULTIMATE FIX FOR NODE 22 / EXPRESS 5
 * We do NOT use app.get('*'). 
 * We use a generic middleware that serves index.html if no other route matched.
 */
app.use((req, res, next) => {
    // If the request is for the API and we got here, it's a 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
    }
    // Otherwise, serve the frontend
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
