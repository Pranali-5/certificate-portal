import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Civicert | Provisional certificate portal",
  description: "A calmer, clearer way to apply for your provisional certificate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
