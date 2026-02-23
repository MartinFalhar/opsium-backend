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

const h = React.createElement;
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

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} Kč`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("cs-CZ");
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("cs-CZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildOrderNumber(order) {
  const yearShort = String(order?.year ?? "")
    .slice(-2)
    .padStart(2, "0");
  const branch = String(order?.branch_id ?? "").padStart(2, "0");
  const number = String(order?.number ?? "").padStart(5, "0");
  return `${yearShort}${branch}${number}`;
}

function getPaymentMethod(attrib) {
  const value = Number(attrib);

  if (value === 1) return "hotovost";
  if (value === 2) return "platební karta";
  if (value === 3) return "převod na účet";
  if (value === 4) return "šek";
  if (value === 5) return "okamžitá QR platba";

  return "platba";
}

function getItemDisplayName(item) {
  if (item.item_type === "goods") {
    return item.goods_model || "Zboží";
  }

  if (item.item_type === "frame") {
    return (
      [item.frame_collection, item.frame_product, item.frame_color]
        .filter(Boolean)
        .join(" ") || "Obruba"
    );
  }

  if (item.item_type === "lens") {
    return item.lens_code || "Brýlové čočky";
  }

  if (item.item_type === "service") {
    return item.service_name || "Služba";
  }

  return "Položka";
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    lineHeight: 1.3,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#dddddd",
    borderStyle: "solid",
    borderRadius: 4,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 2,
  },
  label: {
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bbbbbb",
    borderBottomStyle: "solid",
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
    paddingTop: 2,
    paddingBottom: 2,
  },
  colName: {
    width: "44%",
    paddingRight: 4,
  },
  colType: {
    width: "18%",
    paddingRight: 4,
  },
  colQty: {
    width: "12%",
    textAlign: "right",
    paddingRight: 4,
  },
  colPrice: {
    width: "26%",
    textAlign: "right",
  },
  twoCol: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  half: {
    width: "50%",
  },
  subTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  muted: {
    color: "#555555",
  },
  smallGap: {
    marginBottom: 4,
  },
});

function KeyValue({ label, value }) {
  return h(
    View,
    { style: styles.row },
    h(Text, { style: styles.label }, `${label}:`),
    h(Text, null, String(value ?? "—")),
  );
}

function ItemsTable({ rows, emptyText }) {
  return h(
    View,
    null,
    h(
      View,
      { style: styles.tableHeader },
      h(Text, { style: [styles.colName, styles.label] }, "Položka"),
      h(Text, { style: [styles.colType, styles.label] }, "Typ"),
      h(Text, { style: [styles.colQty, styles.label] }, "Množství"),
      h(Text, { style: [styles.colPrice, styles.label] }, "Cena"),
    ),
    ...(rows.length > 0
      ? rows.map((item) =>
          h(
            View,
            { key: `item-${item.id}`, style: styles.tableRow },
            h(Text, { style: styles.colName }, String(item.displayName ?? "—")),
            h(Text, { style: styles.colType }, String(item.item_type ?? "—")),
            h(Text, { style: styles.colQty }, String(item.quantity ?? "0")),
            h(
              Text,
              { style: styles.colPrice },
              formatCurrency(item.unit_sale_price),
            ),
          ),
        )
      : [
          h(
            View,
            { key: "empty", style: styles.tableRow },
            h(Text, { style: styles.colName }, emptyText),
            h(Text, { style: styles.colType }, ""),
            h(Text, { style: styles.colQty }, ""),
            h(Text, { style: styles.colPrice }, ""),
          ),
        ]),
  );
}

function OrderDocument({
  order,
  fullName,
  address,
  obligatoryItems,
  glassesGroups,
  transactions,
  totalAmount,
  paidAmount,
  remainingAmount,
}) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.title }, "Zakázkový list"),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Zakázka"),
        h(KeyValue, { label: "Číslo", value: buildOrderNumber(order) }),
        h(KeyValue, { label: "Stav", value: order.status || "—" }),
        h(KeyValue, {
          label: "Vytvořeno",
          value: formatDate(order.created_at) || "—",
        }),
        h(KeyValue, {
          label: "Aktualizováno",
          value: formatDateTime(order.updated_at) || "—",
        }),
      ),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Klient"),
        h(KeyValue, { label: "Jméno", value: fullName || "—" }),
        h(KeyValue, { label: "Adresa", value: address || "—" }),
        h(KeyValue, { label: "E-mail", value: order.email || "—" }),
        h(KeyValue, { label: "Telefon", value: order.phone || "—" }),
        h(KeyValue, {
          label: "Dodací adresa",
          value: order.delivery_address || "—",
        }),
        h(KeyValue, { label: "Poznámka", value: order.note || "—" }),
      ),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Povinné položky"),
        h(ItemsTable, {
          rows: obligatoryItems,
          emptyText: "Bez položek",
        }),
      ),
      ...glassesGroups.map((group) =>
        h(
          View,
          { key: `group-${group.groupId}`, style: styles.card },
          h(
            Text,
            { style: styles.sectionTitle },
            `Brýle #${group.groupId} — ${group.glassesType}`,
          ),
          h(ItemsTable, {
            rows: group.items,
            emptyText: "Bez položek",
          }),
          h(
            View,
            { style: styles.twoCol },
            h(
              View,
              { style: styles.half },
              h(Text, { style: styles.subTitle }, "Dioptrie"),
              h(
                Text,
                { style: styles.smallGap },
                `Pravé: SPH ${group.dioptric.ps}, CYL ${group.dioptric.pc}, OSA ${group.dioptric.pa}, ADD ${group.dioptric.padd}, PRIZMA ${group.dioptric.pp}, BÁZE ${group.dioptric.pb}`,
              ),
              h(
                Text,
                null,
                `Levé: SPH ${group.dioptric.ls}, CYL ${group.dioptric.lc}, OSA ${group.dioptric.la}, ADD ${group.dioptric.ladd}, PRIZMA ${group.dioptric.lp}, BÁZE ${group.dioptric.lb}`,
              ),
            ),
            h(
              View,
              { style: styles.half },
              h(Text, { style: styles.subTitle }, "Centrační údaje"),
              h(
                Text,
                { style: styles.smallGap },
                `Pravé: PD ${group.centration.p_pd}, Výška ${group.centration.p_v}, Vertex ${group.centration.p_vd}, Panto ${group.centration.p_panto}`,
              ),
              h(
                Text,
                null,
                `Levé: PD ${group.centration.l_pd}, Výška ${group.centration.l_v}, Vertex ${group.centration.l_vd}, Panto ${group.centration.l_panto}`,
              ),
            ),
          ),
          h(
            Text,
            { style: [styles.muted, { marginTop: 6 }] },
            `PLU obruba: ${group.specs.entered_plu.frame} | PLU zábrus: ${group.specs.entered_plu.service} | PLU čočky: ${group.specs.entered_plu.lenses} | PBS: ${group.specs.pbs}`,
          ),
        ),
      ),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Platby"),
        h(
          View,
          { style: styles.tableHeader },
          h(Text, { style: [styles.colName, styles.label] }, "Datum"),
          h(Text, { style: [styles.colType, styles.label] }, "Metoda"),
          h(Text, { style: [styles.colPrice, styles.label] }, "Částka"),
        ),
        ...(transactions.length > 0
          ? transactions.map((transaction) =>
              h(
                View,
                { key: `payment-${transaction.id}`, style: styles.tableRow },
                h(
                  Text,
                  { style: styles.colName },
                  formatDateTime(transaction.created_at),
                ),
                h(
                  Text,
                  { style: styles.colType },
                  getPaymentMethod(transaction.attrib),
                ),
                h(
                  Text,
                  { style: styles.colPrice },
                  formatCurrency(transaction.amount),
                ),
              ),
            )
          : [
              h(
                View,
                { key: "no-payments", style: styles.tableRow },
                h(Text, { style: styles.colName }, "Bez plateb"),
                h(Text, { style: styles.colType }, ""),
                h(Text, { style: styles.colPrice }, ""),
              ),
            ]),
      ),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Souhrn"),
        h(KeyValue, { label: "Celkem", value: formatCurrency(totalAmount) }),
        h(KeyValue, { label: "Uhrazeno", value: formatCurrency(paidAmount) }),
        h(KeyValue, { label: "Zbývá", value: formatCurrency(remainingAmount) }),
      ),
    ),
  );
}

export async function generateOrderPdf(orderIdInput) {
  const orderId = Number(orderIdInput);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Neplatné ID zakázky.");
  }

  const orderResult = await pool.query(
    `SELECT
       o.id,
       o.number,
       o.year,
       o.branch_id,
       o.client_id,
       o.status,
       o.note,
       o.delivery_address,
       o.total_amount,
       o.paid_amount,
       o.created_at,
       o.updated_at,
       c.degree_before,
       c.name,
       c.surname,
       c.degree_after,
       c.street,
       c.city,
       c.post_code,
       c.email,
       c.phone
     FROM orders o
     LEFT JOIN clients c ON c.id = o.client_id
     WHERE o.id = $1
     LIMIT 1`,
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    throw new Error("Zakázka nebyla nalezena.");
  }

  const order = orderResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT
       oi.id,
       oi.item_type,
       oi.quantity,
       oi.unit_sale_price,
       oi."group",
       oi.specification_id,
       ols.specs,

       sg.model AS goods_model,
       sg.plu AS goods_plu,
       vg.rate AS goods_rate,

       sf.collection AS frame_collection,
       sf.product AS frame_product,
       sf.color AS frame_color,
       sf.size AS frame_size,
       sf.plu AS frame_plu,

       sl.code AS lens_code,
       sl.plu AS lens_plu,
       sl.sph AS lens_sph,
       sl.cyl AS lens_cyl,
       sl.ax AS lens_ax,

       asv.name AS service_name,
       asv.plu AS service_plu,

       odv.ps AS dioptric_ps,
       odv.pc AS dioptric_pc,
       odv.pa AS dioptric_pa,
       odv.padd AS dioptric_padd,
       odv.pp AS dioptric_pp,
       odv.pb AS dioptric_pb,
       odv.ls AS dioptric_ls,
       odv.lc AS dioptric_lc,
       odv.la AS dioptric_la,
       odv.ladd AS dioptric_ladd,
       odv.lp AS dioptric_lp,
       odv.lb AS dioptric_lb,

       oc.p_pd AS centration_p_pd,
       oc.p_v AS centration_p_v,
       oc.p_vd AS centration_p_vd,
       oc.p_panto AS centration_p_panto,
       oc.l_pd AS centration_l_pd,
       oc.l_v AS centration_l_v,
       oc.l_vd AS centration_l_vd,
       oc.l_panto AS centration_l_panto
     FROM orders_items oi
     LEFT JOIN orders_lens_specs ols ON ols.id = oi.specification_id
     LEFT JOIN store_goods sg ON sg.store_item_id = oi.store_item_id AND sg.branch_id = $2
     LEFT JOIN vat_rates vg ON vg.id = sg.vat_type_id
     LEFT JOIN store_frames sf ON sf.store_item_id = oi.store_item_id AND sf.branch_id = $2
     LEFT JOIN store_lens sl ON sl.store_item_id = oi.store_item_id AND sl.branch_id = $2
     LEFT JOIN agenda_services asv
       ON asv.branch_id = $2
      AND asv.plu::text = COALESCE(ols.specs->'entered_plu'->>'service', '')
     LEFT JOIN orders_dioptric_values odv ON odv.order_item_id = oi.id
     LEFT JOIN orders_centrations oc ON oc.order_item_id = oi.id
     WHERE oi.order_id = $1
     ORDER BY oi."group" ASC, oi.id ASC`,
    [orderId, order.branch_id],
  );

  const transactionsResult = await pool.query(
    `SELECT
       t.id,
       t.attrib,
       COALESCE(t.price_a, 0) + COALESCE(t.price_b, 0) + COALESCE(t.price_c, 0) AS amount,
       t.created_at
     FROM transactions t
     WHERE t.order_id = $1
     ORDER BY t.created_at ASC, t.id ASC`,
    [orderId],
  );

  const fullName = [
    order.degree_before,
    order.name,
    order.surname,
    order.degree_after,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const address = [order.street, order.city, order.post_code]
    .filter(Boolean)
    .join(", ");

  const groupedItems = new Map();
  const obligatoryItems = [];

  for (const item of itemsResult.rows) {
    const preparedItem = {
      ...item,
      displayName: getItemDisplayName(item),
    };

    const itemGroup = Number(item.group || 0);

    if (itemGroup === 0) {
      obligatoryItems.push(preparedItem);
      continue;
    }

    if (!groupedItems.has(itemGroup)) {
      groupedItems.set(itemGroup, []);
    }

    groupedItems.get(itemGroup).push(preparedItem);
  }

  const glassesGroups = [...groupedItems.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([groupId, items]) => {
      const frameItem = items.find((item) => item.item_type === "frame");
      const specs = frameItem?.specs || items[0]?.specs || {};

      return {
        groupId,
        items,
        glassesType: specs?.glasses_type || "DÁLKA",
        specs: {
          entered_plu: {
            frame: specs?.entered_plu?.frame || "",
            service: specs?.entered_plu?.service || "",
            lenses: specs?.entered_plu?.lenses || "",
          },
          pbs: specs?.pbs || "",
        },
        dioptric: {
          ps: frameItem?.dioptric_ps ?? "",
          pc: frameItem?.dioptric_pc ?? "",
          pa: frameItem?.dioptric_pa ?? "",
          padd: frameItem?.dioptric_padd ?? "",
          pp: frameItem?.dioptric_pp ?? "",
          pb: frameItem?.dioptric_pb ?? "",
          ls: frameItem?.dioptric_ls ?? "",
          lc: frameItem?.dioptric_lc ?? "",
          la: frameItem?.dioptric_la ?? "",
          ladd: frameItem?.dioptric_ladd ?? "",
          lp: frameItem?.dioptric_lp ?? "",
          lb: frameItem?.dioptric_lb ?? "",
        },
        centration: {
          p_pd: frameItem?.centration_p_pd ?? "",
          p_v: frameItem?.centration_p_v ?? "",
          p_vd: frameItem?.centration_p_vd ?? "",
          p_panto: frameItem?.centration_p_panto ?? "",
          l_pd: frameItem?.centration_l_pd ?? "",
          l_v: frameItem?.centration_l_v ?? "",
          l_vd: frameItem?.centration_l_vd ?? "",
          l_panto: frameItem?.centration_l_panto ?? "",
        },
      };
    });

  const paidFromTransactions = transactionsResult.rows.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  );

  const totalAmount = Number(order.total_amount || 0);
  const paidAmount = Number(order.paid_amount || paidFromTransactions || 0);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  const document = h(OrderDocument, {
    order,
    fullName,
    address,
    obligatoryItems,
    glassesGroups,
    transactions: transactionsResult.rows,
    totalAmount,
    paidAmount,
    remainingAmount,
  });

  const stream = await pdf(document).toBuffer();
  const buffer = await streamToBuffer(stream);

  return {
    buffer,
    filename: `order-${buildOrderNumber(order) || order.id}.pdf`,
  };
}
