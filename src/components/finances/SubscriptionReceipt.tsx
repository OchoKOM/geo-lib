import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { PRICING_PLANS, PlanKey } from '@/lib/pricing-plans';

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
    width: 120,
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

interface SubscriptionReceiptProps {
  user: {
    name: string;
    email: string;
  };
  planKey: PlanKey;
  requestId: string;
  requestDate: Date;
}

export default function SubscriptionReceipt({ user, planKey, requestId, requestDate }: SubscriptionReceiptProps) {
  const plan = PRICING_PLANS[planKey];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Reçu de Demande d&apos;Abonnement</Text>
              <Text style={styles.subTitle}>Bibliothèque Centrale • GeoLib System</Text>
            </View>
            <View>
              <Text style={{ fontSize: 9, backgroundColor: '#eee', padding: 4, borderRadius: 2 }}>
                EN ATTENTE
              </Text>
            </View>
          </View>

          <Text style={styles.ref}>REF: {requestId.substring(0, 8).toUpperCase()}</Text>

          {/* Info Demandeur */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#2563eb' }}>
              Informations du Demandeur
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom complet :</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email :</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </View>

          {/* Info Plan */}
          <View style={styles.box}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#d97706' }}>
              Plan Demandé
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom du Plan :</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{plan.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Durée :</Text>
              <Text style={styles.value}>{plan.days} jours</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Montant :</Text>
              <Text style={styles.value}>${plan.price}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date de Demande :</Text>
              <Text style={styles.value}>{formatDate(requestDate)}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={styles.signatures}>
            <View style={styles.signBox}>
              <Text>Signature du Demandeur</Text>
            </View>
            <View style={styles.signBox}>
              <Text>Validation Bibliothèque</Text>
              <Text style={{ fontSize: 6, color: '#999', marginTop: 2 }}>À valider par un administrateur</Text>
            </View>
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 20, left: 30, fontSize: 8, color: '#ccc' }}>
          Généré automatiquement par GeoLib Admin le {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
};
