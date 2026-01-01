import nodemailer from "nodemailer";
import pool from "../db/index.js";
import { generateInvoicePdf } from "../services/invoicePdf.js";

export async function sendEmail(req, res) {
  const { name, email, message, invoiceId } = req.body;

  // // SMTP Seznam
  // const transporter = nodemailer.createTransport({
  //   host: "smtp.seznam.cz",
  //   port: 465,
  //   secure: true,
  //   auth: {
  //     user: process.env.SMTP_USER, // info@opsium.cz
  //     pass: process.env.SMTP_PASS, // heslo pro aplikaci
  //   },
  // });
  try {
    const result = await pool.query("SELECT * FROM invoices WHERE id = $1", [
      invoiceId,
    ]);

    const invoice = result.rows[0];

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Zakázka nenalezena." });
    }

    // 👉 2. Generování PDF
 const items = Array.isArray(invoice.content) ? invoice.content : [];
console.log("Invoice items:", items);

    const pdfBuffer = await generateInvoicePdf({
      id: invoice.id,
      date: invoice.created_at,
      customer: invoice.customer_name,
      total: invoice.total_price,
      items: items,
    });

    // 👉 3. SMTP Seznam
    const transporter = nodemailer.createTransport({
      host: "smtp.seznam.cz",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 👉 4. Email + příloha
    const mailOptions = {
      from: '"OPSIUM web" <info@opsium.cz>',
      to: email,
      subject: `Faktura ${invoice.id}`,
      text: message,
      attachments: [
        {
          filename: `faktura-${invoice.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "E-mail s fakturou byl odeslán." });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Chyba při odesílání e-mailu." });
  }
}
