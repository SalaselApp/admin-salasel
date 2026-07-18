import "./globals.css";

/**
 * Root layout is intentionally a pass-through. The real <html>/<body>
 * (with the correct `lang`/`dir` per locale) lives in
 * `app/[lang]/layout.tsx`, so locale routing owns document direction.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
