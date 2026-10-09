export type AssetPresence = {
  sellerProductImage: boolean;
  buyerPersonalization: boolean;
};

export type HandoffDecision =
  | { state: "ready_for_fulfillment"; missing: [] }
  | { state: "waiting_for_assets"; missing: Array<keyof AssetPresence> };

export function decideOrderHandoff(assets: AssetPresence): HandoffDecision {
  const missing = (Object.entries(assets) as Array<[keyof AssetPresence, boolean]>)
    .filter(([, found]) => !found)
    .map(([name]) => name);

  return missing.length === 0
    ? { state: "ready_for_fulfillment", missing: [] }
    : { state: "waiting_for_assets", missing };
}
