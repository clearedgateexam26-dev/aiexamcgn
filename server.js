require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ STEP 1: SMART PATH DETECTION
// This checks if 'frontend' folder exists. If not, it uses the current folder.
let frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendPath)) {
    frontendPath = __dirname; 
}
console.log("📂 Serving frontend from:", frontendPath);

app.use(express.static(frontendPath));

// ✅ STEP 2: GITHUB MODELS
const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN, 
});

// ✅ STEP 3: API ROUTE
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
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate" });
    }
});

// ✅ STEP 4: FALLBACK ROUTE
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Error: index.html not found in " + frontendPath);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));
