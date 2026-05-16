/* =========================
   INITIAL SETUP
========================= */

let username = localStorage.getItem("chat_username");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const saveNameBtn = document.getElementById("saveNameBtn");
const sidebarNameInput = document.getElementById("sidebarNameInput");

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const sendBtn = document.getElementById("sendBtn");
const filePreview = document.getElementById("filePreview");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");

let lastMessageCount = 0;

/* =========================
   USERNAME / SIDEBAR
========================= */

if (!username) {
    sidebar.classList.add("active");
    overlay.classList.add("active");
}

sidebarNameInput.value = username || "";

menuBtn.onclick = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
};

overlay.onclick = () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
};

saveNameBtn.onclick = async () => {
    const name = sidebarNameInput.value.trim();
    if (!name) return;

    const formData = new FormData();
    formData.append("name", name);

    const res = await fetch("/set_name", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (data.status === "ok") {
        username = name;
        localStorage.setItem("chat_username", name);

        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    } else {
        alert(data.message); // "Name already taken"
    }
};

/* =========================
   TEXTAREA AUTO EXPAND
========================= */

messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    const maxHeight = 150;

    if (messageInput.scrollHeight < maxHeight) {
        messageInput.style.height = messageInput.scrollHeight + "px";
    } else {
        messageInput.style.height = maxHeight + "px";
        messageInput.style.overflowY = "auto";
    }
});

/* =========================
   ENTER TO SEND
========================= */

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/* =========================
   FILE PREVIEW
========================= */

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = () => {
    filePreview.innerHTML = "";
    const file = fileInput.files[0];
    if (!file) return;

    const box = document.createElement("div");
    box.className = "preview-box";

    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.className = "preview-remove";
    remove.onclick = () => {
        fileInput.value = "";
        filePreview.innerHTML = "";
    };

    box.appendChild(remove);

    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        box.appendChild(img);
    } else {
        const name = document.createElement("div");
        name.textContent = "📎 " + file.name;
        box.appendChild(name);
    }

    filePreview.appendChild(box);
};

/* =========================
   LANGUAGE DETECTION
========================= */

function detectLanguage(code) {
    code = code.trim();

    if (/^\s*</.test(code)) return "markup";
    if (code.includes("{") && code.includes("}") && code.includes(":")) return "css";
    if (code.includes("function") || code.includes("const") || code.includes("let")) return "javascript";
    if (code.includes("def ") || code.includes("import ")) return "python";
    if (code.includes("#include") || code.includes("int main")) return "clike";
    if (code.includes("SELECT ") || code.includes("FROM ")) return "sql";

    return "javascript";
}

function isCodeMessage(text) {
    return (
        text.includes("\n") &&
        (
            text.includes("{") ||
            text.includes(";") ||
            text.includes("<") ||
            text.includes("function") ||
            text.includes("const") ||
            text.includes("def ")
        )
    );
}

/* =========================
   SAFE ESCAPE
========================= */

function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* =========================
   LINK FORMATTER
========================= */

function formatLinks(text) {

    text = escapeHTML(text);

    text = text.replace(/\n/g, "<br>");

    text = text.replace(
        /(https?:\/\/[^\s]+)/gi,
        url => `<a href="${url}" target="_blank">${url}</a>`
    );

    text = text.replace(
        /(^|[\s])www\.[^\s<]+/gi,
        match => {
            const clean = match.trim();
            return ` <a href="https://${clean}" target="_blank">${clean}</a>`;
        }
    );

    text = text.replace(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi,
        email => `<a href="mailto:${email}">${email}</a>`
    );

    return text;
}

/* =========================
   FETCH MESSAGES
========================= */

async function fetchMessages() {
    const response = await fetch("/messages");
    const data = await response.json();

    if (data.length === lastMessageCount) return;

    for (let i = lastMessageCount; i < data.length; i++) {
        const msg = data[i];

        const div = document.createElement("div");
        div.className = "message";

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = msg.name;
        div.appendChild(name);

        if (msg.message) {

            const content = document.createElement("div");
            content.className = "message-content";

            if (isCodeMessage(msg.message)) {

                const lang = detectLanguage(msg.message);
                const codeId = "code_" + Date.now() + Math.random().toString(36).substr(2, 5);

                content.innerHTML = `
                    <div class="code-wrapper">
                        <div class="code-header">
                            <span>${lang.toUpperCase()}</span>
                            <button class="copy-btn" onclick="copyCode('${codeId}', this)">Copy</button>
                        </div>
                        <pre><code id="${codeId}" class="language-${lang}">
${escapeHTML(msg.message)}
                        </code></pre>
                    </div>
                `;

                setTimeout(() => {
                    if (window.Prism) Prism.highlightAll();
                }, 0);

            } else {
                content.innerHTML = formatLinks(msg.message);
            }

            div.appendChild(content);
        }

        if (msg.file) {
            const fileUrl = "/uploads/" + msg.file;

            if (msg.file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {

                const imgWrapper = document.createElement("div");
                imgWrapper.className = "image-wrapper";

                const loader = document.createElement("div");
                loader.className = "image-loader";

                const img = document.createElement("img");
                img.src = fileUrl;
                img.className = "chat-image";
                img.style.display = "none";

                img.onload = () => {
                    loader.style.display = "none";
                    img.style.display = "block";
                };

                img.onclick = () => openImageModal(fileUrl);

                imgWrapper.appendChild(loader);
                imgWrapper.appendChild(img);

                div.appendChild(imgWrapper);
            }
            else {
                const link = document.createElement("a");
                link.href = fileUrl;
                link.target = "_blank";
                link.textContent = "📎 Download File";
                div.appendChild(link);
            }
        }

        const time = document.createElement("div");
        time.className = "time";
        time.textContent = msg.time;
        div.appendChild(time);

        chatBox.appendChild(div);
    }

    lastMessageCount = data.length;

    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
}

/* =========================
   COPY FUNCTION (NO ALERT)
========================= */

function copyCode(id, btn) {
    const codeElement = document.getElementById(id);
    const text = codeElement.innerText;

    navigator.clipboard.writeText(text).then(() => {
        btn.innerText = "Copied ✓";
        setTimeout(() => {
            btn.innerText = "Copy";
        }, 1500);
    });
}

/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {
    const message = messageInput.value;

    if (!username || (!message.trim() && fileInput.files.length === 0)) return;

    const formData = new FormData();
   
    formData.append("message", message);

    if (fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/send", true);

    // 🔥 SHOW UPLOADING STATUS
    const uploadingMsg = document.createElement("div");
    uploadingMsg.className = "message";
    uploadingMsg.innerHTML = `
        <div class="name">System</div>
        <div class="message-content">Uploading... 0%</div>
    `;
    chatBox.appendChild(uploadingMsg);
    chatBox.scrollTo({ top: chatBox.scrollHeight });

    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            uploadingMsg.querySelector(".message-content").innerText =
                "Uploading... " + percent + "%";
        }
    };

    xhr.onload = function () {
        if (xhr.status === 200) {
            uploadingMsg.remove();
            fetchMessages();
        } else {
            uploadingMsg.querySelector(".message-content").innerText =
                "Upload failed (Server Error)";
        }
    };

    xhr.onerror = function () {
        uploadingMsg.querySelector(".message-content").innerText =
            "Upload failed (Network Error)";
    };

    xhr.ontimeout = function () {
        uploadingMsg.querySelector(".message-content").innerText =
            "Upload timeout!";
    };

    xhr.timeout = 10 * 60 * 1000; // 10 minutes

    xhr.send(formData);

    messageInput.value = "";
    messageInput.style.height = "auto";
    fileInput.value = "";
    filePreview.innerHTML = "";
}

sendBtn.onclick = sendMessage;
/* =========================
   IMAGE MODAL
========================= */

function openImageModal(src) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");

    modal.style.display = "flex";
    modalImg.src = src;
}

function closeImageModal() {
    document.getElementById("imageModal").style.display = "none";
}
/* =========================
   POLLING
========================= */

setInterval(fetchMessages, 1000);
fetchMessages();