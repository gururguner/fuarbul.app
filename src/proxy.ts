import { NextResponse, type NextRequest } from "next/server";

const maintenanceEnabled = process.env.MAINTENANCE_MODE !== "false";

const publicAssetPattern =
  /\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|css|js|map|txt|xml)$/i;

export function proxy(request: NextRequest) {
  if (!maintenanceEnabled) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

  if (isMaintenanceAllowedPath(pathname, searchParams)) {
    return NextResponse.next();
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";

  return NextResponse.redirect(maintenanceUrl);
}

function isMaintenanceAllowedPath(
  pathname: string,
  searchParams: URLSearchParams,
) {
  if (
    pathname === "/maintenance" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    publicAssetPattern.test(pathname)
  ) {
    return true;
  }

  if (pathname === "/login") {
    const nextPath = searchParams.get("next");

    return nextPath?.startsWith("/admin") ?? false;
  }

  return false;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
