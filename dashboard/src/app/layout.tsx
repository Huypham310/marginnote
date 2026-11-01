import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MarginNote", template: "%s · MarginNote" },
  description: "Browse, search and export your web highlights",
};

const NAV = [
  { href: "/", label: "Library" },
  { href: "/search", label: "Search" },
  { href: "/tags", label: "Tags" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Margin<span className="bg-yellow-200 px-0.5">Note</span>
            </Link>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-sm text-slate-600 hover:text-slate-900">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
