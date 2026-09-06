const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const historyBox = document.getElementById("history");
const newChatButton = document.getElementById("newChat");

let messages = [];
let currentChatId = null;

let chats = JSON.parse(
    localStorage.getItem("rizo_chats") || "[]"
);


/* ========================================
   ИСТОРИЯ
======================================== */

function saveHistory() {
    localStorage.setItem(
        "rizo_chats",
        JSON.stringify(chats)
    );
}


function showHistory() {

    historyBox.innerHTML = "";

    chats.forEach(item => {

        const row =
            document.createElement("div");

        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "4px";
        row.style.marginBottom = "5px";


        const button =
            document.createElement("button");

        button.textContent =
            item.title || "Новый чат";

        button.style.flex = "1";
        button.style.minWidth = "0";
        button.style.padding = "10px";

        button.style.background =
            currentChatId === item.id
                ? "#2a2a2a"
                : "#212121";

        button.style.border =
            "1px solid #333";

        button.style.borderRadius =
            "8px";

        button.style.color =
            "#ddd";

        button.style.textAlign =
            "left";

        button.style.cursor =
            "pointer";

        button.style.overflow =
            "hidden";

        button.style.textOverflow =
            "ellipsis";

        button.style.whiteSpace =
            "nowrap";

        button.onclick = () => {
            loadChat(item.id);
        };


        const deleteButton =
            document.createElement("button");

        deleteButton.textContent = "🗑";

        deleteButton.style.width = "38px";
        deleteButton.style.height = "38px";
        deleteButton.style.flexShrink = "0";

        deleteButton.style.background =
            "transparent";

        deleteButton.style.border =
            "none";

        deleteButton.style.borderRadius =
            "8px";

        deleteButton.style.color =
            "#777";

        deleteButton.style.cursor =
            "pointer";

        deleteButton.style.fontSize =
            "15px";

        deleteButton.title =
            "Удалить чат";


        deleteButton.onclick =
            event => {

                event.stopPropagation();

                const answer =
                    confirm(
                        "Удалить этот чат?"
                    );

                if (!answer) {
                    return;
                }

                chats =
                    chats.filter(
                        chatItem =>
                            chatItem.id !==
                            item.id
                    );

                saveHistory();

                if (
                    currentChatId ===
                    item.id
                ) {

                    currentChatId =
                        null;

                    messages = [];

                    chat.innerHTML = "";

                    chat.appendChild(
                        welcome
                    );

                    welcome.style.display =
                        "block";
                }

                showHistory();
            };


        row.appendChild(button);
        row.appendChild(deleteButton);

        historyBox.appendChild(row);
    });
}


/* ========================================
   ЗАГРУЗКА ЧАТА
======================================== */

function loadChat(id) {

    const selectedChat =
        chats.find(
            item =>
                item.id === id
        );

    if (!selectedChat) {
        return;
    }

    currentChatId = id;

    messages =
        selectedChat.messages || [];

    chat.innerHTML = "";

    if (messages.length === 0) {

        chat.appendChild(
            welcome
        );

        welcome.style.display =
            "block";

        showHistory();

        return;
    }

    welcome.style.display =
        "none";

    messages.forEach(message => {

        addMessage(
            message.role,
            message.content,
            false
        );

    });

    chat.scrollTop =
        chat.scrollHeight;

    showHistory();
}


/* ========================================
   НОВЫЙ ЧАТ
======================================== */

function createNewChat() {

    currentChatId = null;

    messages = [];

    chat.innerHTML = "";

    chat.appendChild(
        welcome
    );

    welcome.style.display =
        "block";

    input.value = "";

    input.focus();

    showHistory();
}


/* ========================================
   ЗАЩИТА HTML
======================================== */

function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ========================================
   ОЧИСТКА ОТ JSON
======================================== */

function cleanAssistantText(text) {

    if (!text) {
        return "";
    }

    const trimmed =
        text.trim();

    /*
       Если модель всё-таки вернула:

       {"reply":"Привет!"}

       пытаемся показать пользователю
       только сам текст.
    */

    try {

        const parsed =
            JSON.parse(trimmed);

        if (
            parsed &&
            typeof parsed === "object"
        ) {

            if (
                typeof parsed.reply ===
                "string"
            ) {
                return parsed.reply;
            }

            if (
                typeof parsed.response ===
                "string"
            ) {
                return parsed.response;
            }

            if (
                typeof parsed.answer ===
                "string"
            ) {
                return parsed.answer;
            }
        }

    } catch (error) {
        // Обычный текст — всё хорошо.
    }


    /*
       Дополнительная защита
       от простого текста вида:

       {"reply":"..."}
    */

    let cleaned =
        text.trim();

    cleaned =
        cleaned.replace(
            /^\s*\{\s*"reply"\s*:\s*"/,
            ""
        );

    cleaned =
        cleaned.replace(
            /"\s*\}\s*$/,
            ""
        );

    return cleaned;
}


/* ========================================
   MARKDOWN
======================================== */

function renderMarkdown(text) {

    const codeBlocks = [];

    let safe =
        escapeHtml(
            cleanAssistantText(text)
        );


    /*
       Кодовые блоки
    */

    safe = safe.replace(
        /```([\w+-]*)\n?([\s\S]*?)```/g,
        (match, language, code) => {

            const id =
                codeBlocks.length;

            codeBlocks.push({
                language:
                    language || "",

                code:
                    code.trim()
            });

            return (
                `___CODE_BLOCK_${id}___`
            );
        }
    );


    /*
       Заголовки
    */

    safe = safe.replace(
        /^### (.*)$/gm,
        "<h3>$1</h3>"
    );

    safe = safe.replace(
        /^## (.*)$/gm,
        "<h2>$1</h2>"
    );

    safe = safe.replace(
        /^# (.*)$/gm,
        "<h1>$1</h1>"
    );


    /*
       Жирный текст
    */

    safe = safe.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    /*
       Курсив
    */

    safe = safe.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );


    /*
       Inline code
    */

    safe = safe.replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
    );


    /*
       Списки
    */

    safe = safe.replace(
        /^[•*-] (.*)$/gm,
        "<li>$1</li>"
    );

    safe = safe.replace(
        /(<li>.*<\/li>)/gs,
        "<ul>$1</ul>"
    );


    /*
       Ссылки
    */

    safe = safe.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );


    /*
       Переносы строк
    */

    safe = safe.replace(
        /\n/g,
        "<br>"
    );


    /*
       Возвращаем кодовые блоки
    */

    codeBlocks.forEach(
        (block, index) => {

            const language =
                block.language
                    ? `
                        <div class="code-language">
                            ${escapeHtml(
                                block.language
                            )}
                        </div>
                    `
                    : "";


            const codeHtml =
                escapeHtml(
                    block.code
                );


            const html = `
                <div class="code-block">

                    ${language}

                    <button
                        class="copy-code"
                        type="button"
                        onclick="copyCode(this)"
                    >
                        Копировать
                    </button>

                    <pre><code>${codeHtml}</code></pre>

                </div>
            `;


            safe =
                safe.replace(
                    `___CODE_BLOCK_${index}___`,
                    html
                );
        }
    );


    return safe;
}


/* ========================================
   КОПИРОВАНИЕ КОДА
======================================== */

window.copyCode =
    function(button) {

        const code =
            button
                .parentElement
                .querySelector("code")
                .innerText;


        navigator.clipboard
            .writeText(code)
            .then(() => {

                const oldText =
                    button.textContent;

                button.textContent =
                    "Скопировано ✓";


                setTimeout(() => {

                    button.textContent =
                        oldText;

                }, 1500);

            })
            .catch(() => {

                alert(
                    "Не удалось скопировать код"
                );

            });
    };


/* ========================================
   ДОБАВЛЕНИЕ СООБЩЕНИЯ
======================================== */

function addMessage(
    role,
    text,
    scroll = true
) {

    welcome.style.display =
        "none";


    const message =
        document.createElement("div");

    message.className =
        `message ${role}`;


    message.innerHTML = `

        <div class="avatar">
            ${
                role === "assistant"
                    ? "R"
                    : "Вы"
            }
        </div>

        <div class="message-content">

            <div class="message-text"></div>

        </div>
    `;


    const textBox =
        message.querySelector(
            ".message-text"
        );


    if (role === "assistant") {

        textBox.innerHTML =
            renderMarkdown(text);

    } else {

        textBox.textContent =
            text;
    }


    chat.appendChild(
        message
    );


    if (scroll) {

        chat.scrollTop =
            chat.scrollHeight;
    }


    return message;
}


/* ========================================
   СОХРАНЕНИЕ ЧАТА
======================================== */

function saveChat() {

    if (!messages.length) {
        return;
    }


    const firstUserMessage =
        messages.find(
            message =>
                message.role ===
                "user"
        );


    const title =
        firstUserMessage
            ? firstUserMessage.content
                .substring(0, 35)
            : "Новый чат";


    if (currentChatId === null) {

        currentChatId =
            Date.now();


        chats.unshift({

            id:
                currentChatId,

            title:
                title,

            messages:
                [...messages]
        });

    } else {

        const selectedChat =
            chats.find(
                item =>
                    item.id ===
                    currentChatId
            );


        if (selectedChat) {

            selectedChat.title =
                title;

            selectedChat.messages =
                [...messages];
        }
    }


    saveHistory();

    showHistory();
}


/* ========================================
   АНИМАЦИЯ ПЕЧАТИ
======================================== */

function startTypingAnimation(textBox) {

    let dots = 0;

    textBox.textContent =
        "Rizo AI печатает";

    const interval =
        setInterval(() => {

            dots =
                (dots + 1) % 4;

            textBox.textContent =
                "Rizo AI печатает" +
                ".".repeat(dots);

        }, 400);


    return interval;
}


/* ========================================
   ОТПРАВКА СООБЩЕНИЯ
======================================== */

async function sendMessage(text) {

    if (!text.trim()) {
        return;
    }


    const cleanText =
        text.trim();


    /*
       Сообщение пользователя
    */

    addMessage(
        "user",
        cleanText
    );


    messages.push({

        role:
            "user",

        content:
            cleanText
    });


    input.value = "";


    /*
       Сохраняем чат
    */

    saveChat();


    /*
       Создаём сообщение Rizo AI
    */

    const thinking =
        addMessage(
            "assistant",
            ""
        );


    const textBox =
        thinking.querySelector(
            ".message-text"
        );


    /*
       Анимация
    */

    const typingInterval =
        startTypingAnimation(
            textBox
        );


    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            messages:
                                messages
                        })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                "Ошибка сервера"
            );
        }


        if (!response.body) {

            throw new Error(
                "Сервер не вернул ответ"
            );
        }


        /*
           Останавливаем
           анимацию
        */

        clearInterval(
            typingInterval
        );


        textBox.textContent =
            "";


        /*
           Читаем поток
        */

        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder(
                "utf-8"
            );


        let answer = "";


        while (true) {

            const {
                done,
                value
            } =
                await reader.read();


            if (done) {
                break;
            }


            const chunk =
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            answer +=
                chunk;


            /*
               Показываем ответ
               сразу во время генерации
            */

            textBox.innerHTML =
                renderMarkdown(
                    answer
                );


            chat.scrollTop =
                chat.scrollHeight;
        }


        /*
           Финальная очистка
        */

        answer =
            cleanAssistantText(
                answer
            );


        textBox.innerHTML =
            renderMarkdown(
                answer
            );


        /*
           Сохраняем ответ
        */

        messages.push({

            role:
                "assistant",

            content:
                answer
        });


        saveChat();


    } catch (error) {

        clearInterval(
            typingInterval
        );


        textBox.textContent =
            "Не удалось получить ответ. " +
            error.message;

        console.error(
            "Rizo AI:",
            error
        );
    }
}


/* ========================================
   ФОРМА
======================================== */

form.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        sendMessage(
            input.value
        );
    }
);


/* ========================================
   ENTER
======================================== */

input.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            form.requestSubmit();
        }
    }
);


/* ========================================
   ГОТОВЫЕ ВОПРОСЫ
======================================== */

document
    .querySelectorAll(
        "[data-question]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                sendMessage(
                    button.dataset.question
                );
            }
        );
    });


/* ========================================
   НОВЫЙ ЧАТ
======================================== */

newChatButton.addEventListener(
    "click",
    createNewChat
);


/* ========================================
   ЗАПУСК
======================================== */

showHistory();