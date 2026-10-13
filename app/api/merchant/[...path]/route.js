import { proxyMerchantOrderRequest } from "../../../../lib/server/merchant-order-proxy.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  return proxyMerchantOrderRequest(request, context);
}
