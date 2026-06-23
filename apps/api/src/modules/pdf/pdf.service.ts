import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

@Injectable()
export class PdfService {
  constructor() {}

  async generatePdfBuffer(data: {
    number: string;
    amount: number;
    customerEmail: string;
    date: Date;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { height } = page.getSize();
    const margin = 50;

    const textColor = rgb(0.12, 0.12, 0.13);
    const secondaryColor = rgb(0.4, 0.4, 0.4);
    const borderColor = rgb(0.9, 0.9, 0.9);

    page.drawText('INVOICE', {
      x: 450,
      y: height - 80,
      size: 24,
      font: fontBold,
      color: textColor,
    });
    page.drawText(`No: ${data.number || '0000'}`, {
      x: 450,
      y: height - 100,
      size: 10,
      font,
      color: secondaryColor,
    });

    page.drawText('BILL TO:', {
      x: margin,
      y: height - 150,
      size: 9,
      font: fontBold,
      color: secondaryColor,
    });
    page.drawText(data.customerEmail || 'Guest', {
      x: margin,
      y: height - 165,
      size: 12,
      font,
      color: textColor,
    });

    page.drawLine({
      start: { x: margin, y: height - 200 },
      end: { x: 545, y: height - 200 },
      thickness: 1,
      color: borderColor,
    });

    page.drawText('Service Subscription', {
      x: margin,
      y: height - 230,
      size: 12,
      font,
      color: textColor,
    });
    page.drawText(`$${data.amount}`, {
      x: 500,
      y: height - 230,
      size: 12,
      font: fontBold,
      color: textColor,
    });

    page.drawText('TOTAL DUE:', {
      x: 380,
      y: height - 280,
      size: 10,
      font: fontBold,
      color: secondaryColor,
    });
    page.drawText(`$${data.amount}`, {
      x: 480,
      y: height - 280,
      size: 14,
      font: fontBold,
      color: textColor,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
