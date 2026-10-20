// The estimate / invoice as a real PDF (selectable text, prints clean). Same words as the screen card:
// both read docData(). Loaded only when someone taps "Descargar PDF" (see downloadPdf), so the app stays light.
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import type { PublicAttachment } from "@/lib/attachments";
import { docData } from "@/components/document";
import { formatPhone } from "@/lib/phone";

// The app's own fonts (public/fonts, same as the screen): Montserrat text, Righteous name, JetBrains Mono labels
const font = (file: string) => `${window.location.origin}/fonts/${file}`;
Font.register({
  family: "Montserrat",
  fonts: [
    { src: font("Montserrat-Regular.ttf") },
    { src: font("Montserrat-SemiBold.ttf"), fontWeight: 600 },
    { src: font("Montserrat-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({ family: "Righteous", src: font("Righteous-Regular.ttf") });
Font.register({
  family: "JetBrains Mono",
  fonts: [{ src: font("JetBrainsMono-Regular.ttf") }, { src: font("JetBrainsMono-Bold.ttf"), fontWeight: 700 }],
});
Font.registerHyphenationCallback((word) => [word]); // never split a word with a hyphen

const C = { forest: "#073D2D", charcoal: "#202522", muted: "#7C817D", line: "#E3E4DE", ivory: "#F5F5ED", sage: "#DDE7D8", sand: "#F2E8D6", sandInk: "#815C2C" };

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "Montserrat", fontSize: 10, color: C.charcoal },
  row: { flexDirection: "row", justifyContent: "space-between" },
  biz: { fontFamily: "Righteous", fontSize: 18, color: C.forest },
  small: { fontSize: 9, color: C.muted, marginTop: 3 },
  title: { fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", textAlign: "right" },
  num: { fontFamily: "JetBrains Mono", fontSize: 10, textAlign: "right", marginTop: 3 },
  badge: { fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, marginTop: 5, alignSelf: "flex-end" },
  label: { fontFamily: "JetBrains Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: C.muted },
  value: { fontSize: 11, marginTop: 3 },
  hr: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 14 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  lineText: { fontSize: 11, flex: 1, paddingRight: 16 },
  linePrice: { fontSize: 11, fontWeight: 700 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  total: { fontWeight: 700, fontSize: 20 },
  box: { backgroundColor: C.ivory, borderRadius: 6, padding: 10, marginTop: 18 },
  terms: { fontSize: 9, color: C.muted, marginTop: 18, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontFamily: "Righteous", fontSize: 9, color: C.muted, textAlign: "center" }, // like the customer page
});

export function DocumentPdf({
  kind,
  job,
  biz,
  view = "en",
  files = [],
}: {
  kind: "estimate" | "invoice";
  job: Job;
  biz: Business;
  view?: "en" | "es";
  files?: PublicAttachment[];
}) {
  const d = docData(kind, job, view);
  const photos = files.filter((f) => f.kind === "image");
  const docs = files.filter((f) => f.kind === "pdf"); // can't go inside this PDF: listed by name (they're on the link)
  const caption = (f: PublicAttachment) => (view === "en" ? f.captionEn || f.caption : f.caption);
  return (
    <Document title={`${d.title} ${d.num ? d.label : ""}`.trim()} author={biz.businessName || "Mano"} creator="Mano" language={view}>
      <Page size="LETTER" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.biz}>{biz.businessName || "MANO"}</Text>
            {biz.phone ? <Text style={s.small}>{formatPhone(biz.phone)}</Text> : null}
            {biz.email ? <Text style={s.small}>{biz.email}</Text> : null}
            {d.isInvoice && biz.address ? <Text style={s.small}>{biz.address}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>{d.title}</Text>
            {d.num ? (
              <Text style={s.num}>#{d.label}</Text>
            ) : (
              <Text style={[s.badge, { backgroundColor: C.sand, color: C.sandInk }]}>{d.label}</Text>
            )}
            {d.paidStamp ? <Text style={[s.badge, { backgroundColor: C.sage, color: C.forest }]}>{d.paidStamp}</Text> : null}
          </View>
        </View>

        <View style={[s.row, { marginTop: 28 }]}>
          <View style={{ maxWidth: "55%" }}>
            <Text style={s.label}>{d.toLabel}</Text>
            <Text style={[s.value, { fontWeight: 600 }]}>{job.customer_name ?? ""}</Text>
            {job.address ? <Text style={s.small}>{job.address}</Text> : null}
            {job.customer_email ? <Text style={s.small}>{job.customer_email}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>{d.dateLabel}</Text>
            <Text style={s.value}>{d.date}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>{d.untilLabel}</Text>
            <Text style={s.value}>{d.until}</Text>
          </View>
        </View>

        <View style={s.hr} />
        {d.groups.map((g) => (
          <View key={g.site ?? "-"} style={g.site ? { marginTop: 8 } : undefined}>
            {g.site ? (
              <View style={[s.row, { marginBottom: 4 }]} wrap={false}>
                <Text style={s.label}>{g.site}</Text>
                {g.subtotal ? <Text style={s.label}>{g.subtotal}</Text> : null}
              </View>
            ) : null}
            {g.lines.map((i) => (
              <View key={i.id} style={s.line} wrap={false}>
                <Text style={s.lineText}>{i.text}</Text>
                {i.price ? <Text style={s.linePrice}>{i.price}</Text> : null}
              </View>
            ))}
          </View>
        ))}
        <View style={s.hr} />

        {d.priceNote ? <Text style={[s.small, { marginBottom: 8 }]}>{d.priceNote}</Text> : null}
        {d.partial ? (
          <View wrap={false}>
            <View style={s.line}>
              <Text>Total</Text>
              <Text>{d.partial.total}</Text>
            </View>
            <View style={s.line}>
              <Text>{d.partial.paidLabel}</Text>
              <Text>-{d.partial.paid}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={{ fontSize: 11 }}>{d.partial.dueLabel}</Text>
              <Text style={s.total}>{d.partial.due}</Text>
            </View>
          </View>
        ) : (
          <View style={s.totalRow} wrap={false}>
            <Text style={{ fontSize: 11 }}>{d.totalLabel}</Text>
            <Text style={s.total}>{d.total}</Text>
          </View>
        )}

        {d.isInvoice && !job.paid_at && biz.payInfo?.trim() ? (
          <View style={s.box} wrap={false}>
            <Text style={s.label}>{d.howToPayLabel}</Text>
            <Text style={{ fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>{biz.payInfo.trim()}</Text>
          </View>
        ) : null}
        <Text style={s.terms}>{d.terms}</Text>

        <Text style={s.footer} fixed>
          {d.L("Sent with Mano", "Enviado con Mano")}
        </Text>
      </Page>

      {/* the contractor's photos, two to a page, each with its caption */}
      {photos.length > 0 || docs.length > 0 ? (
        <Page size="LETTER" style={s.page}>
          <Text style={[s.label, { marginBottom: 12 }]}>
            {d.L("Photos & files", "Fotos y archivos")} · {d.title} {d.num ? `#${d.label}` : ""}
          </Text>
          {photos.map((f) => (
            <View key={f.id} wrap={false} style={{ marginBottom: 18 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt; the caption is printed below */}
              <Image src={f.url} style={{ maxHeight: 290, objectFit: "contain", objectPosition: "left", borderRadius: 4 }} />
              {caption(f) ? <Text style={{ fontSize: 10, marginTop: 6 }}>{caption(f)}</Text> : null}
            </View>
          ))}
          {docs.length > 0 ? (
            <View wrap={false} style={s.box}>
              <Text style={s.label}>{d.L("Attached files", "Archivos adjuntos")}</Text>
              {docs.map((f) => (
                <Text key={f.id} style={{ fontSize: 10, marginTop: 4 }}>
                  {caption(f) ? `${caption(f)} (${f.name})` : f.name}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={s.footer} fixed>
            {d.L("Sent with Mano", "Enviado con Mano")}
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}
