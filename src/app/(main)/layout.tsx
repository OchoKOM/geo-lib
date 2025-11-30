// Fichier : app/layout.tsx (Adapté)

import { getSession } from '@/lib/auth'; // Importez la fonction serveur
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Récupération de la session et de l'utilisateur côté serveur
  const { user } = await getSession(); 
  
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <AuthProvider initialUser={user}>
          {/* Header est maintenant un composant client qui utilisera useAuth */}
          <Header /> 
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}