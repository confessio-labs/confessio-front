import { NextRequest, NextResponse } from "next/server";

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;

// Half-span of the bounding box (~200km wide)
const LAT_OFFSET = 0.9;
const LNG_OFFSET = 1.3;

function makeBoundsParam(lat: number, lng: number): string {
  const south = (lat - LAT_OFFSET).toFixed(6);
  const west = (lng - LNG_OFFSET).toFixed(6);
  const north = (lat + LAT_OFFSET).toFixed(6);
  const east = (lng + LNG_OFFSET).toFixed(6);
  return `${south},${west},${north},${east}`;
}

async function geolocateIp(
  ip: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,lat,lon`,
      { signal: AbortSignal.timeout(2000) },
    );
    const data = await response.json();
    if (data.status === "success") {
      return { lat: data.lat, lng: data.lon };
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Only act on requests to / without existing bounds
  if (request.nextUrl.searchParams.has("bounds")) {
    return NextResponse.next();
  }

  let lat: number | null = null;
  let lng: number | null = null;

  // 1. Try Vercel geo headers (free, zero latency)
  const vercelLat = request.headers.get("x-vercel-ip-latitude");
  const vercelLng = request.headers.get("x-vercel-ip-longitude");

  if (vercelLat && vercelLng) {
    lat = parseFloat(vercelLat);
    lng = parseFloat(vercelLng);
  }

  // 2. Fall back to ip-api.com
  if (lat === null || lng === null) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip");

    if (ip && !isPrivateIp(ip)) {
      const result = await geolocateIp(ip);
      if (result) {
        lat = result.lat;
        lng = result.lng;
      }
    }
  }

  // 3. Fall back to Paris
  if (lat === null || lng === null) {
    lat = PARIS_LAT;
    lng = PARIS_LNG;
  }

  const url = request.nextUrl.clone();
  url.searchParams.set("bounds", makeBoundsParam(lat, lng));
  return NextResponse.redirect(url);
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

export const config = {
  matcher: "/",
};
