import { generateInvoicePdf } from "../services/invoicePdf.js";
import { generateOrderPdf } from "../services/orderPdf.js";

export async function pdfInvoice(req, res) {
  try {
    const { buffer, filename } = await generateInvoicePdf(req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${filename}`);

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function pdfOrder(req, res) {
  try {
    const { buffer, filename } = await generateOrderPdf(req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${filename}`);

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
