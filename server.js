require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

let frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendPath)) {
    frontendPath = __dirname; 
}

app.use(express.static(frontendPath));

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, 
});

app.get('/api/quiz', async (req, res) => {
    // ✅ Now capturing count and level from the frontend
    const topic = req.query.topic || "General Knowledge";
    const count = req.query.count || 10;
    const level = req.query.level || "medium";

    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "Return ONLY a raw JSON array. No markdown." },
                { 
                  role: "user", 
                  // ✅ Dynamic prompt based on user input
                  content: `Generate ${count} ${level} difficulty MCQs for ${topic}. 
                  Format: [{"q":"text","options":["A","B","C","D"],"correct":0,"explanation":"text"}]` 
                }
            ],
            model: "gpt-4o", 
        });

        const text = response.choices[0].message.content.replace(/```json|```/gi, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate" });
    }
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Error: index.html not found");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));
