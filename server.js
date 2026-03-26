require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require("openai");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Setup Static Path
// This ensures it works locally AND on servers like Render/Vercel
const frontendPath = fs.existsSync(path.join(__dirname, 'frontend')) 
    ? path.join(__dirname, 'frontend') 
    : __dirname;

app.use(express.static(frontendPath));

// 2. Initialize OpenAI (GitHub Models)
// Error check to prevent the server from crashing if token is missing
if (!process.env.GITHUB_TOKEN) {
    console.error("❌ ERROR: GITHUB_TOKEN is not defined in environment variables.");
}

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN || "missing_token", 
});

// 3. Quiz API Route
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";
    
    try {
        const response = await client.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Return ONLY a raw JSON array. No markdown. Use this structure: [{\"q\":\"text\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct\":0,\"explanation\":\"text\"}]" 
                },
                { 
                    role: "user", 
                    content: `Generate 10 MCQs for ${topic} with detailed explanations.` 
                }
            ],
            model: "gpt-4o",
            temperature: 0.7
        });

        let text = response.choices[0].message.content.trim();
        
        // Clean markdown backticks if AI provides them
        text = text.replace(/```json|```/gi, "").trim();
        
        const quizData = JSON.parse(text);
        res.json(quizData);
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate quiz. Check API Token." });
    }
});

// 4. Fallback Route
app.get('*', (req, res) => {
    const file = path.join(frontendPath, 'index.html');
    if (fs.existsSync(file)) {
        res.sendFile(file);
    } else {
        res.status(404).send("index.html not found. Check your file structure.");
    }
});

// 5. Port Binding (Required for successful deployment)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
