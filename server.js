import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "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"; // ganti dengan key baru

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Pesan kosong" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Kamu adalah asisten AI seperti ChatGPT, ramah dan informatif." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server berjalan di http://info-dunia.hanamicloud.biz.id"));
