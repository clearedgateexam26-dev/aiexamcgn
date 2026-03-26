require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// OpenAI setup
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// API
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Return ONLY JSON array. No markdown."
                },
                {
                    role: "user",
                    content: `Generate 10 exam-level MCQs on ${topic} with explanation.
                    Format: [{"q":"","options":["","","",""],"correct":0,"explanation":""}]`
                }
            ]
        });

        let text = response.choices[0].message.content.trim();
        text = text.replace(/```json|```/g, "");

        const data = JSON.parse(text);
        res.json(data);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "AI failed" });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
