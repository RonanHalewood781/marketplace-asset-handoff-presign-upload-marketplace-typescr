import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { InfraiError, infrai } from "./infrai_storage.js";
import { decideOrderHandoff } from "./order_handoff.js";

const app = express();
app.use(express.json({ limit: "32kb" }));

const bucket = process.env.ASSET_BUCKET ?? "marketplace-order-assets";
const port = Number(process.env.PORT ?? 3000);

const uploadRequest = z.object({
  orderId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  owner: z.enum(["seller", "buyer"]),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  bytes: z.number().int().positive().max(10_000_000),
  requestId: z.string().uuid(),
}).strict();

const handoffRequest = z.object({
  orderId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
}).strict();

function assetKey(orderId: string, owner: "seller" | "buyer"): string {
  const filename = owner === "seller" ? "product-image" : "personalization-proof";
  return `orders/${orderId}/${filename}`;
}

app.post("/orders/assets/upload-url", async (req, res, next) => {
  try {
    const input = uploadRequest.parse(req.body);
    const key = assetKey(input.orderId, input.owner);
    const signed = await infrai.storage.object.presign(bucket, key, {
      op: "put",
      expires_seconds: 600,
      content_type: input.contentType,
      max_bytes: input.bytes,
      idempotency_key: input.requestId,
    });
    res.json({ uploadUrl: signed.url, method: "PUT", key });
  } catch (error) {
    next(error);
  }
});

app.post("/orders/handoff", async (req, res, next) => {
  try {
    const input = handoffRequest.parse(req.body);
    const [seller, buyer] = await Promise.all([
      infrai.storage.object.head(bucket, assetKey(input.orderId, "seller")),
      infrai.storage.object.head(bucket, assetKey(input.orderId, "buyer")),
    ]);
    res.json({
      orderId: input.orderId,
      ...decideOrderHandoff({
        sellerProductImage: seller.found,
        buyerPersonalization: buyer.found,
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "invalid_request", issues: error.issues });
    return;
  }
  if (error instanceof InfraiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    res.status(status).json({ error: error.detail.code ?? "storage_request_rejected", message: error.message });
    return;
  }
  res.status(502).json({ error: "storage_transport_error" });
});

async function start(): Promise<void> {
  await infrai.storage.bucket.create({ name: bucket });
  app.listen(port, () => {
    console.log(`Marketplace asset service listening on http://localhost:${port}`);
  });
}

await start();
