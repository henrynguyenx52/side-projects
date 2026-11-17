const $ = (selector) => document.querySelector(selector);
const loginCard = $("#login-card");
const deviceCard = $("#device-card");
const mailbox = $("#mailbox");
const logoutButton = $("#logout");
let pollTimer;

function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

function showError(element, message) {
  element.textContent = message;
  show(element);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok && response.status !== 202) throw new Error(payload.error || "Có lỗi xảy ra.");
  return { response, payload };
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = value || "";
  return span.innerHTML;
}

function safeWebLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function renderMessages(messages) {
  const container = $("#messages");
  if (!messages.length) {
    container.innerHTML = '<div class="empty">Không có email để hiển thị.</div>';
    return;
  }

  container.innerHTML = messages
    .map((message) => {
      const sender = message.from?.emailAddress?.name || message.from?.emailAddress?.address || "Không rõ người gửi";
      const address = message.from?.emailAddress?.address || "";
      const received = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(message.receivedDateTime),
      );
      const subject = message.subject || "(Không có tiêu đề)";
      const webLink = safeWebLink(message.webLink);
      return `
        <article class="message ${message.isRead ? "" : "unread"}">
          <div class="message-meta">
            <div><strong>${escapeText(sender)}</strong><span>${escapeText(address)}</span></div>
            <time>${escapeText(received)}</time>
          </div>
          <h3>${escapeText(subject)}</h3>
          <p>${escapeText(message.bodyPreview || "")}</p>
          ${webLink ? `<a href="${escapeText(webLink)}" target="_blank" rel="noreferrer">Mở trong Outlook ↗</a>` : ""}
        </article>`;
    })
    .join("");
}

async function loadMessages() {
  hide($("#mail-error"));
  $("#messages").innerHTML = '<div class="empty">Đang tải email…</div>';
  try {
    const { payload } = await api("/api/messages?count=15");
    renderMessages(payload.messages);
  } catch (error) {
    showError($("#mail-error"), error.message);
  }
}

function openMailbox(profile) {
  clearTimeout(pollTimer);
  hide(loginCard);
  hide(deviceCard);
  show(mailbox);
  show(logoutButton);
  $("#profile-name").textContent = profile.displayName || "Mail mới nhất";
  $("#profile-email").textContent = profile.mail || profile.userPrincipalName || "";
  loadMessages();
}

async function pollAuthorization(authId) {
  try {
    const { response, payload } = await api(`/api/auth/status?id=${encodeURIComponent(authId)}`);
    if (response.status === 202) {
      pollTimer = setTimeout(() => pollAuthorization(authId), 5000);
      return;
    }
    openMailbox(payload.profile);
  } catch (error) {
    showError($("#device-error"), error.message);
  }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hide($("#login-error"));
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  button.textContent = "Đang kết nối…";
  try {
    const { payload } = await api("/api/auth/start", {
      method: "POST",
      body: JSON.stringify({ email: $("#email").value }),
    });
    if (payload.status === "complete" && payload.profile) {
      openMailbox(payload.profile);
      return;
    }
    $("#user-code").textContent = payload.userCode;
    $("#verify-link").href = payload.verificationUri;
    hide(loginCard);
    show(deviceCard);
    pollAuthorization(payload.authId);
  } catch (error) {
    showError($("#login-error"), error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Đọc thư";
  }
});

$("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#user-code").textContent);
  $("#copy-code").textContent = "Đã sao chép";
});

$("#refresh").addEventListener("click", loadMessages);

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location.reload();
});

async function populateAccounts() {
  try {
    const { payload } = await api("/api/accounts");
    const datalist = $("#accounts-list");
    if (datalist && Array.isArray(payload.accounts)) {
      datalist.innerHTML = payload.accounts
        .map((acc) => `<option value="${escapeText(acc.email)}">${escapeText(acc.email)}${acc.hasRefreshToken ? " (OAuth sẵn sàng)" : ""}</option>`)
        .join("");
      if (!$("#email").value && payload.accounts[0]) {
        $("#email").value = payload.accounts[0].email;
      }
    }
  } catch (_) {
    // Ignore error if not loaded
  }
}

async function restoreSession() {
  try {
    const { payload } = await api("/api/me");
    openMailbox(payload.profile);
  } catch {
    show(loginCard);
    populateAccounts();
  }
}

restoreSession();
