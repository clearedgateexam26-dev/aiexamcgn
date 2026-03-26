require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ STEP 1: STATIC FILE SERVING
// Adjust this to wherever your index.html is located
let frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendPath)) {
    frontendPath = __dirname; 
}
app.use(express.static(frontendPath));

// ✅ STEP 2: GITHUB MODELS CONFIGURATION
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, 
});

// ✅ STEP 3: API ROUTE WITH EXPLANATION LOGIC
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";
    
    try {
        const response = await client.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are a professional exam generator. 
                    Return ONLY a raw JSON array of 10 objects. 
                    Do not include markdown formatting, backticks, or "json" labels.
                    Each object must strictly follow this structure:
                    {"q": "question", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "detailed reason"}`
                },
                { 
                    role: "user", 
                    content: `Generate a 10-question MCQ quiz about: ${topic}. 
                    Ensure the 'explanation' field is detailed and educational.` 
                }
            ],
            model: "gpt-4o", // Or "gpt-4o-mini" for faster results
            temperature: 0.7
        });

        // Extract the text content
        let rawContent = response.choices[0].message.content.trim();

        // CLEANING: Remove markdown code blocks if the AI accidentally included them
        const cleanedJson = rawContent
            .replace(/^```json/i, '') // Remove opening ```json
            .replace(/^```/i, '')     // Remove opening ```
            .replace(/```$/i, '')      // Remove closing ```
            .trim();

        try {
            const quizData = JSON.parse(cleanedJson);
            res.json(quizData);
        } catch (parseError) {
            console.error("Failed to parse AI JSON:", cleanedJson);
            res.status(500).json({ error: "AI returned invalid JSON format" });
        }

    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "Failed to connect to AI service" });
    }
});

// ✅ STEP 4: FALLBACK TO INDEX.HTML
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("index.html not found");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
🚀 Server is screaming fast on port ${PORT}
📂 Serving files from: ${frontendPath}
🔗 http://localhost:${PORT}
    `);
});
