import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const appDescription =
  "AI-driven predictive maintenance web application designed to monitor upstream oil and gas equipment, predict potential failures, assess equipment health and risk and provide explainable maintenance recommendations through intelligent analytics.";

export const metadata: Metadata = {
  title: {
    template: "%s | AEGIS",
    default: "AEGIS",
  },
  description: appDescription,
  keywords:
    "AI, Predictive Maintenance, Upstream, Oil and Gas, Equipment Health, Oil and Gas Equipment Risk Assessment, Machine Learning, Explainable AI, Decision Support, Failure Prediction, Asset Management, Reliability Engineering",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AEGIS",
  },
  openGraph: {
    images: "/opengraph-image.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} scroll-smooth antialiased`}
    >
      <body className="min-h-dvh">
        <AppProviders>
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
