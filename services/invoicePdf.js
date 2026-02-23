import React from "react";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import pool from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_FAMILY = "NotoSansCZ";

Font.register({
  family: FONT_FAMILY,
  fonts: [
    {
      src: path.resolve(
        __dirname,
        "../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff",
      ),
      fontWeight: 400,
    },
    {
      src: path.resolve(
        __dirname,
        "../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff",
      ),
      fontWeight: 700,
    },
  ],
});

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 28,
    paddingBottom: 28,
    paddingLeft: 28,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: 700,
  },
  section: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    fontWeight: 700,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
    paddingTop: 4,
    paddingBottom: 4,
  },
});

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} Kč`;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function InvoiceDocument({ invoice }) {
  const h = React.createElement;
  const invoiceItems = ensureArray(invoice.content);

  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.title }, "Faktura"),
      h(
        View,
        { style: styles.section },
        h(
          View,
          { style: styles.row },
          h(Text, { style: styles.label }, "Číslo:"),
          h(Text, null, String(invoice.id ?? "")),
        ),
        h(
          View,
          { style: styles.row },
          h(Text, { style: styles.label }, "Datum:"),
          h(Text, null, formatDate(invoice.created_at)),
        ),
        h(
          View,
          { style: styles.row },
          h(Text, { style: styles.label }, "Zákazník:"),
          h(Text, null, String(invoice.customer_name ?? "—")),
        ),
      ),
      h(Text, { style: [styles.label, { marginBottom: 6 }] }, "Položky"),
      ...(invoiceItems.length > 0
        ? invoiceItems.map((item, index) =>
            h(
              View,
              { key: `item-${index}`, style: styles.itemRow },
              h(
                View,
                { style: styles.row },
                h(Text, null, String(item?.name ?? `Položka ${index + 1}`)),
                h(Text, null, formatCurrency(item?.price)),
              ),
            ),
          )
        : [h(Text, { key: "no-items" }, "Bez položek")]),
      h(
        View,
        { style: [styles.section, { marginTop: 12 }] },
        h(
          View,
          { style: styles.row },
          h(Text, { style: styles.label }, "Celkem:"),
          h(Text, null, formatCurrency(invoice.total_price)),
        ),
      ),
    ),
  );
}

export async function generateInvoicePdf(invoiceIdInput) {
  const invoiceId = Number(invoiceIdInput?.id ?? invoiceIdInput);

  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("Neplatné ID faktury");
  }

  const invoiceResult = await pool.query(
    "SELECT * FROM invoices WHERE id = $1",
    [invoiceId],
  );

  if (invoiceResult.rows.length === 0) {
    throw new Error("Zakázka nenalezena");
  }

  const invoice = invoiceResult.rows[0];

  const document = React.createElement(InvoiceDocument, { invoice });
  const stream = await pdf(document).toBuffer();
  const buffer = await streamToBuffer(stream);

  return {
    buffer,
    filename: `invoice-${invoice.id}.pdf`,
  };
}
