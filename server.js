require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require("openai");

const app = express();

// ✅ 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// ✅ 2. STATIC FILES
// This serves the CONTENTS of the frontend folder at the root (/)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ✅ 3. GITHUB MODELS CONFIG
// This uses the OpenAI-compatible SDK for GitHub Models
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, // Make sure GITHUB_TOKEN is set in Render Env Vars
});

// ✅ 4. QUIZ API ROUTE
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Awareness";
    
    try {
        console.log(`📡 Fetching quiz for: ${topic}`);

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a professional quiz generator. Return ONLY a raw JSON array. No conversational text or markdown code blocks." },
                { role: "user", content: `Generate 10 high-quality MCQs for ${topic}. Structure: [{"q": "Question?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Reason"}]` }
            ],
            model: "gpt-4o", // Ensure you have access to this model in GitHub Models
            temperature: 0.7,
        });

        let text = response.choices[0].message.content;

        // Strip markdown if the AI includes it
        const cleanJson = text.replace(/```json|```/gi, "").trim();
        
        const data = JSON.parse(cleanJson);
        res.json(data);
        console.log("✅ Quiz successfully sent to frontend");

    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "Failed to generate quiz. Check API Key/Model access." });
    }
});

// ✅ 5. CATCH-ALL ROUTE (THE FIX)
// This serves index.html for any request that IS NOT an API call.
// This prevents the "Unexpected token <" error by ensuring you don't 
// accidentally fetch an HTML page when you want JSON data.
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ✅ 6. SERVER START
// Render automatically provides a PORT environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running!`);
    console.log(`🏠 Local: http://localhost:${PORT}`);
});
