import { ClerkProvider } from "@clerk/nextjs";
import { brandThemeV1 } from "@projectedge/schemas";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { IBM_Plex_Mono, IBM_Plex_Sans, Rajdhani } from "next/font/google";
import "./globals.css";
import { isShowcaseMode } from "@/lib/e2e-auth";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: brandThemeV1.product.name,
  description: brandThemeV1.product.descriptor,
  title: {
    default: brandThemeV1.product.name,
    template: `%s · ${brandThemeV1.product.name}`,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const hasClerkKeys = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY,
  );
  const shouldUseClerk = !isShowcaseMode() && (hasClerkKeys || process.env.NODE_ENV === "development");

  const content = (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${rajdhani.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );

  if (!shouldUseClerk) {
    return content;
  }

  return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">{content}</ClerkProvider>;
}
