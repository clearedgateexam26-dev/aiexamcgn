require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// Path logic for Render deployment
const frontendPath = fs.existsSync(path.join(__dirname, 'frontend')) 
    ? path.join(__dirname, 'frontend') 
    : __dirname;

app.use(express.static(frontendPath));

// GitHub Models / Azure Inference Setup
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, 
});

app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";
    const count = parseInt(req.query.count) || 5;
    const level = req.query.level || "medium";

    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "Return ONLY a raw JSON array. No markdown, no triple backticks." },
                { 
                  role: "user", 
                  content: `Generate ${count} ${level} difficulty MCQs about ${topic}. 
                  Format: [{"q":"Question text","options":["A","B","C","D"],"correct":0,"explanation":"Why it is correct"}]` 
                }
            ],
            model: "gpt-4o", 
        });

        let text = response.choices[0].message.content.trim();
        
        // Clean up AI response if it includes markdown accidentally
        text = text.replace(/```json|```/gi, "").trim();
        
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate quiz. Check your GITHUB_TOKEN." });
    }
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Frontend files not found.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
