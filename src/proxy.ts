import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/supabase-config";
import { serviceCookie } from "./lib/service";

export async function proxy(request: NextRequest) {
  const connection = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!connection) return response;
  const service = request.nextUrl.pathname === "/servizio" || request.nextUrl.pathname.startsWith("/servizio/");

  const db = createServerClient(connection.url, connection.key, {
    cookieOptions: { ...(service ? serviceCookie : {}), httpOnly: true, secure: request.nextUrl.protocol === "https:" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });
  await db.auth.getClaims();
  return response;
}

export const config = { matcher: ["/admin/:path*", "/login", "/servizio/:path*"] };
