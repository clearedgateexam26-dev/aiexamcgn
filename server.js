require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve static files from the frontend folder
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ✅ GitHub Models Init (using OpenAI SDK)
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, // Ensure this is in your .env
});

// ✅ API Route
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Awareness";
    
    try {
        console.log(`📡 Requesting GitHub Model: ${topic}`);

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a quiz generator. Return ONLY raw JSON array. No markdown." },
                { role: "user", content: `Generate 10 high-quality MCQs for ${topic}. Structure: [{"q": "Question?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Reason"}]` }
            ],
            model: "gpt-4o", 
            temperature: 0.7,
        });

        let text = response.choices[0].message.content;
        const cleanJson = text.replace(/```json|```/gi, "").trim();
        res.json(JSON.parse(cleanJson));
        console.log("✅ Quiz sent");
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "API Failed" });
    }
});

// ✅ Fix for Express 5: Serve index.html for any other route
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));