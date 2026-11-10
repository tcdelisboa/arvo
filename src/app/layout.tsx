import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk/index.css";
import "@fontsource-variable/newsreader/opsz.css";
import "./globals.css";
import { appUrl } from "@/lib/url";

const APP_URL = appUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Arvo. Start investing with what you have", template: "%s | Arvo" },
  description:
    "Arvo shows where your money goes, works out what you can afford to invest, and builds a plan that fits your risk profile.",
  applicationName: "Arvo",
  appleWebApp: { capable: true, title: "Arvo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Arvo. Start investing with what you have",
    description:
      "See where your money goes, find what you can afford to invest, and get a plan that fits your risk profile.",
    type: "website",
    siteName: "Arvo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1412" },
  ],
};

// Runs before first paint so the chosen theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem("arvo-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
