import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(req: NextRequest) {
  const { quote, customerName, businessName } = await req.json();

  // Create a PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Stream the PDF back in the response
  const buffers: Buffer[] = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {}); // Explicit listener

  // Generate PDF content
  doc.fontSize(20).text(`Quote for ${customerName}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Business: ${businessName}`);
  doc.moveDown();
  doc.fontSize(16).text(quote.title);
  doc.fontSize(12).text(quote.description);
  doc.moveDown();
  doc.fontSize(14).text(`Price: ${quote.price}`);
  doc.moveDown();
  
  doc.fontSize(12).text("Includes:");
  quote.includes.forEach((item: string) => {
    doc.text(`- ${item}`);
  });
  doc.moveDown();

  doc.fontSize(12).text("Cost Breakdown:");
  quote.breakdown.forEach((item: { item: string; cost: string; explanation: string }) => {
    doc.text(`${item.item}: ${item.cost} - ${item.explanation}`);
  });
  doc.moveDown();

  doc.end();

  // Wait for the document to finish generating
  await new Promise((resolve) => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(buffers);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=quote-${quote.tier}.pdf`,
    },
  });
}
