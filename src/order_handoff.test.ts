import { describe, expect, it } from "vitest";
import { decideOrderHandoff } from "./order_handoff.js";

describe("order asset handoff", () => {
  it("waits for the buyer proof even after the seller image arrives", () => {
    expect(decideOrderHandoff({
      sellerProductImage: true,
      buyerPersonalization: false,
    })).toEqual({
      state: "waiting_for_assets",
      missing: ["buyerPersonalization"],
    });
  });

  it("releases an order only when both marketplace assets exist", () => {
    expect(decideOrderHandoff({
      sellerProductImage: true,
      buyerPersonalization: true,
    })).toEqual({ state: "ready_for_fulfillment", missing: [] });
  });
});
