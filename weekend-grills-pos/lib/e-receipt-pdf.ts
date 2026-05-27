import type { PublicPosReceipt } from '@/types/pos';

export const E_RECEIPT_BRAND_NAME = 'Weekend Grills';
export const E_RECEIPT_BRAND_BYLINE = 'by Bakar & Roast';

const FLAME_RGB: [number, number, number] = [249, 115, 22];
const INK_RGB: [number, number, number] = [15, 14, 13];
const MUTED_RGB: [number, number, number] = [115, 115, 115];
const EMERALD_RGB: [number, number, number] = [5, 150, 105];

function formatMoney(n: number) {
  return `RM ${n.toFixed(2)}`;
}

function receiptFilename(orderNumber: string) {
  const safe = orderNumber.replace(/[^\w-]+/g, '-');
  return `${safe}-receipt.pdf`;
}

function serviceLabel(serviceType: PublicPosReceipt['serviceType']) {
  return serviceType === 'EAT_HERE' ? 'Eat here' : 'Takeaway';
}

function paymentLabel(method: PublicPosReceipt['paymentMethod']) {
  return method === 'CASH' ? 'Cash' : 'QR Pay';
}

/** Builds a PDF blob matching the guest e-receipt layout. */
export async function createReceiptPdfBlob(
  receipt: PublicPosReceipt,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 22;
  const contentW = pageW - margin * 2;
  let y = 28;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageH - margin) return;
    doc.addPage();
    y = margin;
  };

  const line = (gap = 5) => {
    y += gap;
  };

  doc.setTextColor(...FLAME_RGB);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(E_RECEIPT_BRAND_NAME.toUpperCase(), pageW / 2, y, { align: 'center' });
  line(5);

  doc.setTextColor(...MUTED_RGB);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(E_RECEIPT_BRAND_BYLINE, pageW / 2, y, { align: 'center' });
  line(8);

  doc.setTextColor(...INK_RGB);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt', pageW / 2, y, { align: 'center' });
  line(10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_RGB);
  doc.text(`Order ${receipt.orderNumber}`, pageW / 2, y, { align: 'center' });
  line(6);

  doc.setTextColor(...INK_RGB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(receipt.customerName, pageW / 2, y, { align: 'center' });
  line(6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_RGB);
  doc.text(
    `${serviceLabel(receipt.serviceType)} · ${paymentLabel(receipt.paymentMethod)}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  line(5);
  doc.text(new Date(receipt.createdAt).toLocaleString(), pageW / 2, y, {
    align: 'center',
  });
  line(8);

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  line(8);

  for (const item of receipt.items) {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK_RGB);
    const nameLines = doc.splitTextToSize(item.name, contentW * 0.62);
    doc.text(nameLines, margin, y);
    doc.text(formatMoney(item.lineTotal), pageW - margin, y, { align: 'right' });
    y += nameLines.length * 4.5;

    if (item.choicesSummary?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED_RGB);
      const choiceLines = doc.splitTextToSize(item.choicesSummary, contentW * 0.62);
      doc.text(choiceLines, margin, y);
      y += choiceLines.length * 4;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED_RGB);
    doc.text(
      `${formatMoney(item.unitPrice)} × ${item.quantity}`,
      margin,
      y,
    );
    y += 5;

    if (item.remarks?.trim()) {
      doc.setTextColor(180, 83, 9);
      const noteLines = doc.splitTextToSize(`Note: ${item.remarks.trim()}`, contentW);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4;
    }

    line(4);
  }

  if (receipt.notes?.trim()) {
    ensureSpace(14);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED_RGB);
    const noteLines = doc.splitTextToSize(receipt.notes.trim(), contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  ensureSpace(24);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  line(8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_RGB);
  doc.text('Subtotal', margin, y);
  doc.setTextColor(...INK_RGB);
  doc.text(formatMoney(receipt.subtotal), pageW - margin, y, { align: 'right' });
  line(6);

  if (receipt.discountAmount > 0) {
    doc.setTextColor(5, 150, 105);
    const discountLabel =
      receipt.discountPercent != null
        ? `Discount (${receipt.discountPercent}%)`
        : 'Discount';
    doc.text(discountLabel, margin, y);
    doc.text(`− ${formatMoney(receipt.discountAmount)}`, pageW - margin, y, {
      align: 'right',
    });
    line(6);
  }

  if (receipt.tip > 0) {
    doc.setTextColor(...MUTED_RGB);
    doc.text('Tip', margin, y);
    doc.setTextColor(...INK_RGB);
    doc.text(formatMoney(receipt.tip), pageW - margin, y, { align: 'right' });
    line(6);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...FLAME_RGB);
  doc.text('Total', margin, y);
  doc.text(formatMoney(receipt.total), pageW - margin, y, { align: 'right' });
  line(10);

  if (receipt.paymentStatus === 'PAID' && receipt.paidAt) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...EMERALD_RGB);
    doc.text(
      `PAID · ${new Date(receipt.paidAt).toLocaleString()}`,
      pageW / 2,
      y,
      { align: 'center' },
    );
    line(8);
  } else {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED_RGB);
    doc.text(`Payment: ${receipt.paymentStatus}`, pageW / 2, y, { align: 'center' });
    line(8);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_RGB);
  doc.text('THANK YOU — SEE YOU SOON', pageW / 2, y, { align: 'center' });

  return doc.output('blob');
}

/** Creates a blob URL and triggers a file download (no print dialog). */
export async function downloadReceiptPdf(receipt: PublicPosReceipt): Promise<string> {
  const blob = await createReceiptPdfBlob(receipt);
  const url = URL.createObjectURL(blob);
  const filename = receiptFilename(receipt.orderNumber);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}
