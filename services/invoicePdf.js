import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import pool from "../db/index.js";

export async function generateInvoicePdf(invoiceId) {
    console.log("Generating PDF for invoice ID:", invoiceId.id);
  const invoiceResult = await pool.query(
    "SELECT * FROM invoices WHERE id = $1",
    [invoiceId.id]
  );

  if (invoiceResult.rows.length === 0) {
    throw new Error("Zakázka nenalezena");
  }

  const invoice = invoiceResult.rows[0];

  const items = await pool.query(
    "SELECT * FROM invoices WHERE id = $1",
    [invoiceId.id]
  );


  const printData = {
    number: invoice.id,
    date: invoice.created_at.toISOString().split("T")[0],
    customer: invoice.customer_name,
    total: invoice.total_price,
    items: invoice.content
  };

  const template = fs.readFileSync(
    path.join(process.cwd(), "pdf/invoice.html"),
    "utf8"
  );

//   const itemsHtml = printData.items
//     .map(
//       i => `<tr><td>${i.name}</td><td>${i.price} Kč</td></tr>`
//     )
//     .join("");

  const html = template
    .replace("{{number}}", printData.number)
    .replace("{{date}}", printData.date)
    .replace("{{customer}}", printData.customer)
    .replace("{{items}}", printData.items);

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return pdfBuffer;

}
