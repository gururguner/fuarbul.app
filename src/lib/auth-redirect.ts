export function getSafeRedirectPath(
  value: string | string[] | undefined,
  fallback = "/profile",
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return fallback;
  }

  return rawValue;
}

export function getPostAuthRedirectPath(
  value: string | string[] | undefined,
  fallback = "/profile",
) {
  const path = getSafeRedirectPath(value, fallback);

  if (isAuthPagePath(path)) {
    return fallback;
  }

  return path;
}

export function withNextParam(pathname: string, nextPath: string) {
  const params = new URLSearchParams({
    next: nextPath,
  });

  return `${pathname}?${params.toString()}`;
}

function isAuthPagePath(path: string) {
  return (
    path === "/login" ||
    path.startsWith("/login?") ||
    path === "/register" ||
    path.startsWith("/register?")
  );
}
