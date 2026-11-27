import { PdfProcessor } from './pdf.processor';

jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
}));
jest.mock('../storage', () => ({ StorageService: class {} }));
jest.mock('../billing/invoice', () => ({ InvoiceRepository: class {} }));
jest.mock('../sender/email', () => ({ EmailService: class {} }));
jest.mock('./pdf.service', () => ({ PdfService: class {} }));

describe('PdfProcessor invoice upload', () => {
  const storage = { upload: jest.fn() };
  const pdf = { generatePdfBuffer: jest.fn() };
  const invoices = { updatePdfUrl: jest.fn() };
  const email = { sendInvoiceEmail: jest.fn() };

  const processor = new (PdfProcessor as unknown as new (
    ...args: unknown[]
  ) => PdfProcessor)(pdf, storage, invoices, email);

  beforeEach(() => {
    jest.resetAllMocks();
    pdf.generatePdfBuffer.mockResolvedValue(Buffer.from('pdf'));
    storage.upload.mockResolvedValue('https://files.test.dev/x.pdf');
  });

  it('stores the PDF under an unguessable key (sequential numbers are public)', async () => {
    await processor.createPdfInvoice({
      invoiceId: 'i1',
      invoiceNumber: 'INV-2026-1001',
      amount: 1000,
      currency: 'usd',
      date: '2026-11-27',
    } as never);

    const params = storage.upload.mock.calls[0][0] as {
      fileName: string;
      folder: string;
    };

    expect(params.folder).toBe('invoices');
    expect(params.fileName).toMatch(/^[0-9a-f-]{36}\/INV-2026-1001\.pdf$/);
    expect(invoices.updatePdfUrl).toHaveBeenCalledWith(
      'i1',
      'https://files.test.dev/x.pdf',
    );
  });
});
