require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).send("GROQ_API_KEY не настроен на сервере.");
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).send("Неверный формат messages.");
    }

    const groqMessages = [
      {
        role: "system",
        content:
          "Ты Rizo AI — дружелюбный и полезный ИИ-ассистент. Отвечай на языке пользователя. Если пользователь пишет по-русски, отвечай по-русски. Отвечай естественно, понятно и подробно, когда это нужно. Никогда не оборачивай обычный ответ в JSON. Не добавляй поля reply, response, answer или другие JSON-обёртки, если пользователь прямо этого не просит."
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: groqMessages,
          stream: true,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq error:", errorText);
      return res.status(response.status).send(errorText);
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || !trimmed.startsWith("data:")) {
          continue;
        }

        const data = trimmed.slice(5).trim();

        if (data === "[DONE]") {
          continue;
        }

        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;

          if (text) {
            res.write(text);
          }
        } catch (error) {
          // Игнорируем незавершённый SSE-фрагмент
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("Rizo AI error:", error);

    if (!res.headersSent) {
      res.status(500).send("Ошибка Rizo AI: " + error.message);
    } else {
      res.end();
    }
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🤖 Rizo AI запущен!");
  console.log("🧠 Groq: openai/gpt-oss-20b");
  console.log(`🌐 http://localhost:${PORT}`);
});
