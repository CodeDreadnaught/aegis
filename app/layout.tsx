import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | AEGIS",
    default: "AEGIS",
  },
  description:
    "AI-driven predictive maintenance web application designed to monitor upstream oil and gas equipment, predict potential failures, assess equipment health and risk and provide explainable maintenance recommendations through intelligent analytics.",
  keywords:
    "AI, Predictive Maintenance, Upstream, Oil and Gas, Equipment Health, Oil and Gas Equipment Risk Assessment, Machine Learning, Explainable AI, Decision Support, Failure Prediction, Asset Management, Reliability Engineering",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} scroll-smooth antialiased`}>
      <body className="min-h-dvh">
        <AppProviders>
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
