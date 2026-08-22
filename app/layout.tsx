import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth antialiased`}>
      <body className="min-h-dvh">
        <AppProviders>
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
