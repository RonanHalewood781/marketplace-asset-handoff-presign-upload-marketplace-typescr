const serviceUrl = process.env.SERVICE_URL ?? "http://localhost:3000";
const orderId = `order-${Date.now()}`;

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(serviceUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result as T;
}

for (const owner of ["seller", "buyer"] as const) {
  const ticket = await post<{ uploadUrl: string; method: "PUT" }>(
    "/orders/assets/upload-url",
    {
      orderId,
      owner,
      contentType: "image/png",
      bytes: 8,
      requestId: crypto.randomUUID(),
    },
  );
  const upload = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: { "Content-Type": "image/png" },
    body: new TextEncoder().encode("demo-png"),
  });
  if (!upload.ok) throw new Error(`Upload rejected with status ${upload.status}`);
}

const handoff = await post("/orders/handoff", { orderId });
console.log(JSON.stringify(handoff, null, 2));
