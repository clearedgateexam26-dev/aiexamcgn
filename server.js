// ... (previous imports and setup stay the same)

// ✅ UPDATED API ROUTE
app.get('/api/quiz', async (req, res) => {
    const topic = req.query.topic || "General Knowledge";
    try {
        const response = await client.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Return ONLY a raw JSON array. You are an expert exam tutor. Every question must include a detailed explanation." 
                },
                { 
                    role: "user", 
                    content: `Generate 10 MCQs for ${topic}. 
                    Format exactly as: [{"q":"Question text","options":["A","B","C","D"],"correct":0,"explanation":"Explain why the answer is correct and why others are wrong."}]` 
                }
            ],
            model: "gpt-4o", 
        });

        let text = response.choices[0].message.content.trim();
        
        // Clean markdown backticks if the model ignores the "raw JSON" instruction
        text = text.replace(/```json|```/gi, "").trim();
        
        const quizData = JSON.parse(text);
        res.json(quizData);
    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ error: "AI failed to generate quiz or explanation" });
    }
});

// ... (rest of the server code stays the same)
