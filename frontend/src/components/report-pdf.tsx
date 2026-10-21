// The Reportes page as a PDF for the owner or their accountant: the same numbers (buildReport), in the app's language.
// Loaded only when someone taps "Descargar PDF".
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/components/pdf-fonts";
import { money } from "@/lib/api";
import type { Report } from "@/lib/reports";

const C = {
  forest: "#073D2D",
  charcoal: "#202522",
  muted: "#7C817D",
  line: "#E3E4DE",
  ivory: "#F5F5ED",
  overdue: "#9B493B",
};

const s = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Montserrat",
    fontSize: 10,
    color: C.charcoal,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  biz: { fontFamily: "Righteous", fontSize: 18, color: C.forest },
  small: { fontSize: 9, color: C.muted, marginTop: 3 },
  title: {
    fontFamily: "JetBrains Mono",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "right",
  },
  label: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  hero: { fontSize: 26, fontWeight: 700, marginTop: 4 },
  stat: { flex: 1, backgroundColor: C.ivory, borderRadius: 6, padding: 10 },
  statValue: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 22, marginBottom: 6 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  note: { fontSize: 8, color: C.muted, marginTop: 6 },
});

export type ReportPdfText = {
  business: string;
  title: string;
  periodName: string;
  rangeLabel: string;
  made: string;
  bucketLabel: (i: number) => string;
  t: {
    repCollected: string;
    repCollectedSub: string;
    repBilled: string;
    repPending: string;
    repOverdue: string;
    repAsOfToday: string;
    repChartTitle: string;
    repEstimates: string;
    repSent: string;
    repApproved: string;
    repRate: string;
    repApprovedValue: string;
    repTopClients: string;
    repPdfPayments: string;
    repNoPayments: string;
    invoices: (n: number) => string;
    payMethod: (m: string) => string;
  };
};

export function ReportPdf({
  report: r,
  text: x,
}: {
  report: Report;
  text: ReportPdfText;
}) {
  const { t } = x;
  return (
    <Document title={`${x.title} · ${x.periodName}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.biz}>{x.business}</Text>
            <Text style={s.small}>{x.made}</Text>
          </View>
          <View>
            <Text style={s.title}>{x.title}</Text>
            <Text style={[s.small, { textAlign: "right" }]}>
              {x.periodName} · {x.rangeLabel}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 28 }}>
          <Text style={s.label}>{t.repCollected}</Text>
          <Text style={s.hero}>{money(r.collected)}</Text>
          <Text style={s.small}>{t.repCollectedSub}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <View style={s.stat}>
            <Text style={s.label}>{t.repBilled}</Text>
            <Text style={s.statValue}>{money(r.billed)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>{t.repPending}</Text>
            <Text style={s.statValue}>{money(r.open.pending.total)}</Text>
            <Text style={s.small}>{t.invoices(r.open.pending.count)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>{t.repOverdue}</Text>
            <Text
              style={[
                s.statValue,
                r.open.overdue.total > 0 ? { color: C.overdue } : {},
              ]}
            >
              {money(r.open.overdue.total)}
            </Text>
            <Text style={s.small}>{t.invoices(r.open.overdue.count)}</Text>
          </View>
        </View>
        <Text style={s.note}>{t.repAsOfToday}</Text>

        <Text style={s.h2}>{t.repChartTitle}</Text>
        {r.buckets.map((b, i) => (
          <View key={b.from} style={s.line}>
            <Text>{x.bucketLabel(i)}</Text>
            <Text style={b.amount ? { fontWeight: 700 } : { color: C.muted }}>
              {money(b.amount)}
            </Text>
          </View>
        ))}

        <Text style={s.h2}>{t.repEstimates}</Text>
        <View style={s.line}>
          <Text>{t.repSent}</Text>
          <Text>{r.estimates.sent}</Text>
        </View>
        <View style={s.line}>
          <Text>{t.repApproved}</Text>
          <Text>{r.estimates.approved}</Text>
        </View>
        <View style={s.line}>
          <Text>{t.repRate}</Text>
          <Text>
            {r.estimates.rate === null ? "—" : `${r.estimates.rate}%`}
          </Text>
        </View>
        <View style={s.line}>
          <Text>{t.repApprovedValue}</Text>
          <Text>{money(r.estimates.approvedTotal)}</Text>
        </View>

        {r.top.length > 0 && (
          <>
            <Text style={s.h2}>{t.repTopClients}</Text>
            {r.top.map((c) => (
              <View key={c.client} style={s.line}>
                <Text>{c.client}</Text>
                <Text>{money(c.amount)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.h2} break={r.payments.length > 12}>
          {t.repPdfPayments}
        </Text>
        {r.payments.length === 0 && (
          <Text style={s.small}>{t.repNoPayments}</Text>
        )}
        {r.payments.map((p, i) => (
          <View key={i} style={s.line} wrap={false}>
            <Text style={{ width: 70 }}>{p.date}</Text>
            <Text style={{ flex: 1 }}>{p.client}</Text>
            <Text style={{ width: 70 }}>{p.invoice}</Text>
            <Text style={{ width: 70, color: C.muted }}>
              {p.method === "—" ? "—" : t.payMethod(p.method)}
            </Text>
            <Text style={{ width: 70, textAlign: "right" }}>
              {money(p.amount)}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
