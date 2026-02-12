import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "system" },
    });

    const faviconUrl = settings?.faviconUrl;

    if (!faviconUrl) {
      // Return 404 to fall back to static favicon
      return new NextResponse(null, { status: 404 });
    }

    // Fetch the favicon from the URL and proxy it
    const faviconResponse = await fetch(faviconUrl);
    
    if (!faviconResponse.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const faviconBuffer = await faviconResponse.arrayBuffer();
    const contentType = faviconResponse.headers.get("content-type") || "image/x-icon";

    return new NextResponse(faviconBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return new NextResponse(null, { status: 404 });
  }
}
