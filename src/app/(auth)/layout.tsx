// Fichier : app/layout.tsx (Adapté)

import { getSession } from '@/lib/auth'; 
import { notFound } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Récupération de la session et de l'utilisateur côté serveur
  const { user } = await getSession(); 

  if (user) {
    return notFound();
  }
  
  return (
          <>{children}</>
  );
}