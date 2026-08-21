import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
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
    <html
      lang="en"
      className={`${montserrat.variable} font-montserrat scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main>{children}</main>
      </body>
    </html>
  );
}
