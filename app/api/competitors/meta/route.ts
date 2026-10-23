import { NextResponse } from "next/server";
import { checkAccess } from "@/lib/ai";
import { MetaAdsRequest } from "@/lib/schemas";

export const runtime = "nodejs";

type MetaAd = {
  id: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  publisher_platforms?: string[];
};

/** Searches Meta's Ad Library. Commercial ads are only returned for ads delivered in the EU (Meta's rule). */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const token = process.env.META_AD_LIBRARY_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "META_AD_LIBRARY_TOKEN isn't set on the server. Add a Meta access token with Ad Library API access to use this import.", code: "config" },
      { status: 501 },
    );
  }
  const parsed = MetaAdsRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  const { query, countries, limit, activeOnly } = parsed.data;

  const url = new URL(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}/ads_archive`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("ad_reached_countries", JSON.stringify(countries));
  url.searchParams.set("ad_type", "ALL");
  url.searchParams.set("ad_active_status", activeOnly ? "ACTIVE" : "ALL");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,publisher_platforms",
  );

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch {
    return NextResponse.json({ error: "Couldn't reach Meta's Ad Library." }, { status: 503 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: `Meta Ad Library: ${data?.error?.message ?? res.status}` }, { status: 502 });

  const now = Date.now();
  const ads = ((data.data ?? []) as MetaAd[]).map((a) => {
    const start = a.ad_delivery_start_time ? Date.parse(a.ad_delivery_start_time) : NaN;
    const stop = a.ad_delivery_stop_time ? Date.parse(a.ad_delivery_stop_time) : now;
    const body = (a.ad_creative_bodies ?? [])[0] ?? "";
    const platforms = a.publisher_platforms ?? [];
    return {
      pageName: a.page_name ?? "",
      platform: platforms.includes("instagram") && !platforms.includes("facebook") ? "instagram" : "facebook",
      format: "",
      hook: body.split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 200) ?? "",
      body,
      cta: (a.ad_creative_link_titles ?? [])[0] ?? "",
      offer: "",
      angle: "",
      visual: "",
      daysRunning: Number.isFinite(start) ? Math.max(0, Math.round((stop - start) / 864e5)) : null,
      sourceUrl: a.ad_snapshot_url ? `https://www.facebook.com/ads/library/?id=${a.id}` : "",
    };
  });
  return NextResponse.json({ ads });
}
