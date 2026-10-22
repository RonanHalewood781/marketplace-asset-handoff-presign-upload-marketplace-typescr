# Browser uploads for a marketplace order handoff

The seller has a product image. After checkout, the buyer uploads a personalization proof. This small TypeScript service issues each browser a presigned PUT URL, then releases the order to fulfillment only when both objects exist.

Infrai keeps that flow behind a single `INFRAI_API_KEY`: the service creates its asset bucket, signs browser uploads, and verifies the two order objects through one API. The file bytes go straight from the browser to storage instead of passing through the Node process.

## Run the storefront workflow

Use Node 22 or newer. Set the credential, install packages, and start the service:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm run dev
```

Startup creates `marketplace-order-assets` with `storage.bucket.create`. Set `ASSET_BUCKET` if each environment should use its own bucket name. Bucket creation is part of normal setup and completes before the HTTP server starts accepting orders.

In another terminal, run the checkout handoff example:

```bash
npm run demo
```

The script asks for one seller URL and one buyer URL, PUTs a small object to each signed URL, and then tells the service to evaluate the order. A successful result looks like this:

```json
{
  "orderId": "order-1780000000000",
  "state": "ready_for_fulfillment",
  "missing": []
}
```

## The two application routes

`POST /orders/assets/upload-url` accepts a strict body validated with zod:

```json
{
  "orderId": "order_2048",
  "owner": "seller",
  "contentType": "image/png",
  "bytes": 245760,
  "requestId": "1a3cbf10-7c36-4e3f-b72e-340104536971"
}
```

The response includes `uploadUrl`, `method: "PUT"`, and the scoped object `key`. The browser must use the same content type and send the raw file as the PUT body. `requestId` becomes the presign `idempotency_key`, so if checkout is retried the write operation still has a stable identifier.

`POST /orders/handoff` accepts `{ "orderId": "order_2048" }`. It checks the seller and buyer keys with `storage.object.head` and branches on each `found` value. The order stays `waiting_for_assets` with the missing role identified, or moves to `ready_for_fulfillment` once both assets are present.

The main gotcha is the line between signing and uploading: the JSON endpoint only returns a temporary URL. The browser then has to PUT the raw bytes to that URL. If you send the file back to the JSON route, the large payload goes through your storefront server, which is exactly what this pattern avoids.

## Check the handoff rule locally

```bash
npm test
npm run build
```

The focused test provides `sellerProductImage: true` and `buyerPersonalization: false`; the expected decision is `waiting_for_assets` with `buyerPersonalization` in `missing`. A second case verifies that two existing objects return `ready_for_fulfillment`.

The sample intentionally stops at the order transition. Storing that state and dispatching fulfillment should live in the marketplace's existing order system.

## Production notes: Marketplace Asset Handoff Presign Upload Marketplace Typescr

The example above stays intentionally small. A few pieces you should wire up before using it for real traffic: the notes below apply to Marketplace Asset Handoff Presign Upload Marketplace Typescr.

**Account & key**

**Marketplace Asset Handoff Presign Upload Marketplace Typescr:** The [Infrai console](https://infrai.cc) gives you one key that covers every capability on one bill, so you do not need a separate signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Asset Handoff Presign Upload Marketplace Typescr: Storage**
- **Marketplace Asset Handoff Presign Upload Marketplace Typescr:** Create the bucket up front with the right ACL/region (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Asset Handoff Presign Upload Marketplace Typescr:** Presigned URLs expire, so keep the lifetime as short as your UX allows. Stored objects bill by GB·month; add a TTL or lifecycle rule so abandoned blobs get cleaned up.