"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  label: string;
  active?: boolean;
}

/** Plain header link; also used as the Suspense fallback before the pathname is known. */
export function NavLink({ href, label, active = false }: Props) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`text-sm ${active ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
    >
      {label}
    </Link>
  );
}

/**
 * Header link that looks active on its own section (page views count as Library).
 * usePathname is request data on dynamic routes, so the layout wraps this in <Suspense>.
 */
export function ActiveNavLink({ href, label }: Props) {
  const path = usePathname();
  const active = href === "/" ? path === "/" || path.startsWith("/pages/") : path.startsWith(href);
  return <NavLink href={href} label={label} active={active} />;
}
