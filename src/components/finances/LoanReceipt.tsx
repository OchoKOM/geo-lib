import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { DashboardLoan } from '@/lib/types';

// Définition des styles PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
    borderBottom: '1px dashed #999', // Ligne de découpe
    paddingBottom: 20
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #000',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subTitle: {
    fontSize: 10,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    color: '#444',
    fontSize: 10
  },
  value: {
    flex: 1,
    fontSize: 10
  },
  box: {
    marginTop: 15,
    padding: 10,
    border: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    borderRadius: 4
  },
  signatures: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: {
    width: '40%',
    borderTop: '1px solid #000',
    paddingTop: 5,
    fontSize: 8,
    textAlign: 'center'
  },
  ref: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 8,
    color: '#999'
  }
});

// Helper pour formater les dates
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Composant pour un volet unique (réutilisé 2x)
const ReceiptSection = ({ loan, copyName }: { loan: DashboardLoan, copyName: string }) => (
  <View style={styles.section}>
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Reçu de Prêt</Text>
        <Text style={styles.subTitle}>Bibliothèque Centrale • GeoLib System</Text>
      </View>
      <View>
        <Text style={{ fontSize: 9, backgroundColor: '#eee', padding: 4, borderRadius: 2 }}>
          {copyName}
        </Text>
      </View>
    </View>

    <Text style={styles.ref}>REF: {loan.id.substring(0, 8).toUpperCase()}</Text>

    {/* Info Emprunteur */}
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#2563eb' }}>
        Informations Emprunteur
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Nom complet :</Text>
        <Text style={styles.value}>{loan.user?.name || loan.user?.username || 'N/A'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Email :</Text>
        <Text style={styles.value}>{loan.user?.email || 'N/A'}</Text>
      </View>
    </View>

    {/* Info Livre */}
    <View style={styles.box}>
      <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#d97706' }}>
        Ouvrage Emprunté
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Titre :</Text>
        <Text style={[styles.value, { fontWeight: 'bold' }]}>{loan.book?.title || 'Titre inconnu'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Date de Prêt :</Text>
        <Text style={styles.value}>{formatDate(loan.loanDate)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>À rendre avant :</Text>
        <Text style={[styles.value, { color: '#dc2626' }]}>{formatDate(loan.dueDate)}</Text>
      </View>
    </View>

    {/* Signatures */}
    <View style={styles.signatures}>
      <View style={styles.signBox}>
        <Text>Signature du Bibliothécaire</Text>
      </View>
      <View style={styles.signBox}>
        <Text>Signature de l&apos;Emprunteur</Text>
        <Text style={{ fontSize: 6, color: '#999', marginTop: 2 }}>Je m&apos;engage à restituer ce livre en bon état.</Text>
      </View>
    </View>
  </View>
);

interface LoanReceiptProps {
  loan: DashboardLoan;
}

export const LoanReceipt = ({ loan }: LoanReceiptProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Copie Bibliothèque */}
      <ReceiptSection loan={loan} copyName="COPIE ARCHIVE (Bibliothèque)" />
      
      {/* Espace vide pour pliage/découpe */}
      <View style={{ height: 20 }} />

      {/* Copie Étudiant */}
      <ReceiptSection loan={loan} copyName="COPIE EMPRUNTEUR" />
      
      <Text style={{ position: 'absolute', bottom: 20, left: 30, fontSize: 8, color: '#ccc' }}>
        Généré automatiquement par GeoLib Admin le {new Date().toLocaleDateString()}
      </Text>
    </Page>
  </Document>
);