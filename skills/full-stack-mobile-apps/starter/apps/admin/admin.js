const tokenInput = document.getElementById("token");
const titleInput = document.getElementById("title");
const status = document.getElementById("status");
const list = document.getElementById("items");
let token = "";

async function request(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `HTTP ${response.status}`);
  return data;
}

async function refresh() {
  const data = await request("/items");
  list.replaceChildren(...data.items.map((item) => {
    const li = document.createElement("li");
    li.textContent = item.title;
    return li;
  }));
}

document.getElementById("connect").addEventListener("click", async () => {
  token = tokenInput.value.trim();
  status.textContent = "";
  try { await refresh(); }
  catch (error) { status.textContent = error.message; }
});

document.getElementById("addForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";
  try {
    await request("/items", { method: "POST", body: JSON.stringify({ title: titleInput.value }) });
    titleInput.value = "";
    await refresh();
  } catch (error) { status.textContent = error.message; }
});
