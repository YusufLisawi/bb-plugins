const api = process.env.API_URL ?? "http://localhost:3090";
const web = process.env.WEB_URL ?? "http://localhost:8090";
const admin = process.env.ADMIN_URL ?? "http://localhost:8091";

async function check(url, expectedStatus, verify = () => {}) {
  const response = await fetch(url);
  if (response.status !== expectedStatus) throw new Error(`${url}: expected ${expectedStatus}, got ${response.status}`);
  await verify(response);
  console.log(`✓ ${url}`);
}

await check(`${api}/health`, 200, async (r) => {
  if ((await r.json()).ok !== true) throw new Error("Health payload invalid");
});
await check(`${api}/v1/items`, 200, async (r) => {
  if (!Array.isArray((await r.json()).items)) throw new Error("Items payload invalid");
});
await check(`${api}/admin/items`, 401);
await check(web, 200);
await check(`${web}/privacy.html`, 200);
await check(`${web}/terms.html`, 200);
await check(`${web}/support.html`, 200);
await check(admin, 200);
console.log("Read-only smoke checks passed");
