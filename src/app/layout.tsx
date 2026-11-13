import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk/index.css";
import "@fontsource-variable/newsreader/opsz.css";
import "./globals.css";
import { appUrl } from "@/lib/url";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n";

const APP_URL = appUrl();

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const title = t("Arvo. Start investing with what you have");
  return {
  metadataBase: new URL(APP_URL),
  title: { default: title, template: "%s | Arvo" },
  description: t(
    "Arvo shows where your money goes, works out what you can afford to invest, and builds a plan that fits your risk profile.",
  ),
  applicationName: "Arvo",
  appleWebApp: { capable: true, title: "Arvo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    title,
    description: t("See where your money goes, find what you can afford to invest, and get a plan that fits your risk profile."),
    type: "website",
    siteName: "Arvo",
  },
  };
}

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getI18n();
  return (
    <html lang={lang === "pt" ? "pt-BR" : "en"} className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
