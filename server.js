import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
    try {
        const messages = req.body.messages || [];

        if (!messages.length) {
            return res.status(400).json({
                error: "Сообщение не найдено"
            });
        }

        const response = await fetch(
            "http://localhost:11434/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: "llama3.2",

                    messages: [
                        {
                            role: "system",

                            content: `
Ты — Rizo AI, умный, дружелюбный и полезный AI-помощник.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:

1. Если пользователь пишет на русском языке — отвечай на русском языке.
2. Отвечай естественно, понятно и по делу.
3. Не начинай ответ с ненужных технических пояснений.
4. Не используй JSON.
5. НИКОГДА не используй формат {"reply":"..."}.
6. НИКОГДА не используй поля reply, response, answer или другие технические поля.
7. Не заключай обычный ответ в фигурные скобки.
8. Пользователь должен видеть обычный человеческий текст.
9. Если пользователь просит объяснение — объясняй простыми словами.
10. Если вопрос сложный — разбивай ответ на понятные шаги.
11. Если пользователь просит код — используй обычный блок кода Markdown.
12. Не говори, что ты Ollama или llama3.2. Ты — Rizo AI.

Пример правильного ответа:

Привет! 👋 Рад тебя видеть. Чем могу помочь?

Пример неправильного ответа:

{"reply":"Привет! Чем могу помочь?"}

Никогда не используй неправильный формат.
                            `.trim()
                        },

                        ...messages
                    ],

                    stream: true,

                    keep_alive: "10m",

                    options: {
                        temperature: 0.7,
                        num_predict: 512
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                errorText || "Ollama не отвечает"
            );
        }

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer = "";

        while (true) {

            const {
                done,
                value
            } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(
                value,
                {
                    stream: true
                }
            );

            const lines =
                buffer.split("\n");

            buffer =
                lines.pop();

            for (const line of lines) {

                if (!line.trim()) {
                    continue;
                }

                try {

                    const data =
                        JSON.parse(line);

                    if (
                        data.message &&
                        data.message.content
                    ) {

                        res.write(
                            data.message.content
                        );

                    }

                } catch (error) {

                    console.error(
                        "Ошибка обработки:",
                        error
                    );

                }
            }
        }

        res.end();

    } catch (error) {

        console.error(
            "Ошибка Rizo AI:",
            error
        );

        if (!res.headersSent) {

            res.status(500).json({
                error:
                    "Ошибка Rizo AI: " +
                    error.message
            });

        } else {

            res.end();

        }
    }
});

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "🤖 Rizo AI запущен!"
        );

        console.log(
            "🦙 Ollama: llama3.2"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log("");

    }
);