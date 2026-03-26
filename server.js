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
const frontendPath = fs.existsSync(path.join(__dirname, 'frontend')) 
    ? path.join(__dirname, 'frontend') 
    : __dirname;

app.use(express.static(frontendPath));

// 2. Initialize OpenAI (GitHub Models)
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
                    content: "Return ONLY a raw JSON array. No markdown. Format: [{\"q\":\"text\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct\":0,\"explanation\":\"text\"}]" 
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
        text = text.replace(/```json|```/gi, "").trim();
        
        const quizData = JSON.parse(text);
        res.json(quizData);
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate quiz." });
    }
});

// 4. FIX: The Wildcard Route for Express 5.0+
// Instead of '*', we use '(.*)' to catch all frontend routes
app.get('(.*)', (req, res) => {
    const file = path.join(frontendPath, 'index.html');
    if (fs.existsSync(file)) {
        res.sendFile(file);
    } else {
        res.status(404).send("index.html not found. Check your file structure.");
    }
});

// 5. Port Binding
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live on port ${PORT}`);
});
