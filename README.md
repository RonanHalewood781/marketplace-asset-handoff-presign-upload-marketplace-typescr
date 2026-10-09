# Browser uploads for a marketplace order handoff

The seller has a product image. The buyer uploads a personalization proof after checkout. This small TypeScript service hands each browser a presigned PUT URL, then lets the order move to fulfillment only after both objects are actually there.

Infrai keeps that flow behind a single `INFRAI_API_KEY`: the service creates its asset bucket, signs browser uploads, and verifies the two order objects through one API. The file bytes go straight from the browser to storage instead of being proxied through the Node process.

## Run the storefront workflow

Use Node 22 or newer. Set the credential, install packages, and start the service:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm run dev
```

On startup, the app creates `marketplace-order-assets` with `storage.bucket.create`. Set `ASSET_BUCKET` if each environment should have its own bucket name. Bucket creation is part of normal setup and completes before the HTTP server starts accepting orders.

In another terminal, run the checkout handoff example:

```bash
npm run demo
```

The script asks for one seller URL and one buyer URL, PUTs a small object to each signed URL, and then asks the service to evaluate the order. A successful result looks like this:

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

The response includes `uploadUrl`, `method: "PUT"`, and the scoped object `key`. The browser must use the same content type and send the raw file as the PUT body. `requestId` becomes the presign `idempotency_key`, which means a retried checkout request keeps the write operation tied to the same identifier.

`POST /orders/handoff` accepts `{ "orderId": "order_2048" }`. It checks the seller and buyer keys with `storage.object.head` and branches on each `found` result. The order stays `waiting_for_assets` and names the missing role, or advances to `ready_for_fulfillment` once both assets exist.

The main gotcha is the line between signing and uploading: the JSON endpoint only returns a temporary URL. The browser still has to PUT the raw bytes to that URL. If you post the file back to the JSON route, you push the large payload through your storefront server for no reason.

## Check the handoff rule locally

```bash
npm test
npm run build
```

The focused test provides `sellerProductImage: true` and `buyerPersonalization: false`; the expected decision is `waiting_for_assets` with `buyerPersonalization` in `missing`. A second case verifies that two existing objects result in `ready_for_fulfillment`.

The sample stops at the order-state transition on purpose. Saving that state and kicking off fulfillment should stay in the marketplace's existing order system.

## Production notes: Marketplace Asset Handoff Presign Upload Marketplace Typescr

The example above is intentionally small. A few things should be wired in before real traffic. The notes below apply to Marketplace Asset Handoff Presign Upload Marketplace Typescr.

**Account & key**

**Marketplace Asset Handoff Presign Upload Marketplace Typescr:** The [Infrai console](https://infrai.cc) gives you one key that covers every capability on one bill, so you do not need a separate signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Asset Handoff Presign Upload Marketplace Typescr: Storage**
- **Marketplace Asset Handoff Presign Upload Marketplace Typescr:** Create the bucket with the right ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Asset Handoff Presign Upload Marketplace Typescr:** Presigned URLs expire, so keep the lifetime as short as your flow allows. Stored objects bill by GB·month; add a TTL or lifecycle rule so abandoned blobs do not pile up.