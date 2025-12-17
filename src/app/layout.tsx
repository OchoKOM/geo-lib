import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastContainer } from "@/components/ToastContainer";




export const metadata: Metadata = {
  title: "GeoLib",
  description: "Accédez à des milliers de TFC, mémoires, thèses et rapports de stage géolocalisés.",
  icons: {
    // Ceci est la structure recommandée pour l'App Router
    icon: [
      {
        url: '/static/favicon', // icône par défaut
        type: 'image/svg+xml',
      },
      {
        url: '/static/favicon',
        media: '(prefers-color-scheme: light)', 
        type: 'image/svg+xml',
      },
      {
        url: '/static/favicon?theme=dark',
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning >
      <body
      >
        <main>
          <ToastContainer />
          <ThemeProvider>
          {children}
          </ThemeProvider>
        </main>
        
      </body>
    </html>
  );
}
