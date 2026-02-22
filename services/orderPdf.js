import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import pool from "../db/index.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const items = itemsResult.rows;
  const groupedItems = new Map();
  const obligatoryItems = [];

  for (const item of items) {
    const itemGroup = Number(item.group || 0);

    const displayName =
      item.item_type === "goods"
        ? item.goods_model || "Zboží"
        : item.item_type === "frame"
          ? [item.frame_collection, item.frame_product, item.frame_color]
              .filter(Boolean)
              .join(" ") || "Obruba"
          : item.item_type === "lens"
            ? item.lens_code || "Brýlové čočky"
            : item.item_type === "service"
              ? item.service_name || "Služba"
              : "Položka";

    const rowHtml = `
      <tr>
        <td>${escapeHtml(displayName)}</td>
        <td>${escapeHtml(item.item_type)}</td>
        <td>${escapeHtml(item.quantity)}</td>
        <td>${formatCurrency(item.unit_sale_price)}</td>
      </tr>
    `;

    if (itemGroup === 0) {
      obligatoryItems.push(rowHtml);
      continue;
    }

    if (!groupedItems.has(itemGroup)) {
      groupedItems.set(itemGroup, []);
    }

    groupedItems.get(itemGroup).push({
      ...item,
      rowHtml,
    });
  }

  const obligatoryRows = obligatoryItems.join("");

  const glassesSections = [...groupedItems.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([groupId, groupItems]) => {
      const rowsHtml = groupItems.map((item) => item.rowHtml).join("");
      const frameItem = groupItems.find((item) => item.item_type === "frame");
      const specs = frameItem?.specs || groupItems[0]?.specs || {};

      const dioptricTable = `
        <table class="detail-table">
          <thead>
            <tr>
              <th>Oko</th>
              <th>SPH</th>
              <th>CYL</th>
              <th>OSA</th>
              <th>ADD</th>
              <th>PRIZMA</th>
              <th>BÁZE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pravé</td>
              <td>${escapeHtml(frameItem?.dioptric_ps ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_pc ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_pa ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_padd ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_pp ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_pb ?? "")}</td>
            </tr>
            <tr>
              <td>Levé</td>
              <td>${escapeHtml(frameItem?.dioptric_ls ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_lc ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_la ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_ladd ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_lp ?? "")}</td>
              <td>${escapeHtml(frameItem?.dioptric_lb ?? "")}</td>
            </tr>
          </tbody>
        </table>
      `;

      const centrationTable = `
        <table class="detail-table">
          <thead>
            <tr>
              <th>Oko</th>
              <th>PD</th>
              <th>Výška</th>
              <th>Vertex</th>
              <th>Panto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pravé</td>
              <td>${escapeHtml(frameItem?.centration_p_pd ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_p_v ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_p_vd ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_p_panto ?? "")}</td>
            </tr>
            <tr>
              <td>Levé</td>
              <td>${escapeHtml(frameItem?.centration_l_pd ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_l_v ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_l_vd ?? "")}</td>
              <td>${escapeHtml(frameItem?.centration_l_panto ?? "")}</td>
            </tr>
          </tbody>
        </table>
      `;

      return `
        <section class="section card">
          <h3>Brýle #${groupId} — ${escapeHtml(specs?.glasses_type || "DÁLKA")}</h3>
          <table>
            <thead>
              <tr>
                <th>Položka</th>
                <th>Typ</th>
                <th>Množství</th>
                <th>Cena</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="grid-two">
            <div>
              <h4>Dioptrie</h4>
              ${dioptricTable}
            </div>
            <div>
              <h4>Centrační údaje</h4>
              ${centrationTable}
            </div>
          </div>
          <p><strong>PLU obruba:</strong> ${escapeHtml(specs?.entered_plu?.frame || "")}</p>
          <p><strong>PLU zábrus:</strong> ${escapeHtml(specs?.entered_plu?.service || "")}</p>
          <p><strong>PLU čočky:</strong> ${escapeHtml(specs?.entered_plu?.lenses || "")}</p>
          <p><strong>PBS:</strong> ${escapeHtml(specs?.pbs || "")}</p>
        </section>
      `;
    })
    .join("");

  const paymentRows = transactionsResult.rows
    .map((transaction) => {
      const method =
        Number(transaction.attrib) === 1
          ? "hotovost"
          : Number(transaction.attrib) === 2
            ? "platební karta"
            : Number(transaction.attrib) === 3
              ? "převod na účet"
              : Number(transaction.attrib) === 4
                ? "šek"
                : Number(transaction.attrib) === 5
                  ? "okamžitá QR platba"
                  : "platba";

      return `
        <tr>
          <td>${escapeHtml(formatDateTime(transaction.created_at))}</td>
          <td>${escapeHtml(method)}</td>
          <td>${formatCurrency(transaction.amount)}</td>
        </tr>
      `;
    })
    .join("");

  const paidFromTransactions = transactionsResult.rows.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  );

  const totalAmount = Number(order.total_amount || 0);
  const paidAmount = Number(order.paid_amount || paidFromTransactions || 0);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  const template = fs.readFileSync(
    path.join(process.cwd(), "pdf/order.html"),
    "utf8",
  );
  const styles = fs.readFileSync(
    path.join(process.cwd(), "pdf/order.css"),
    "utf8",
  );

  const html = template
    .replace("{{styles}}", styles)
    .replace("{{orderNumber}}", escapeHtml(buildOrderNumber(order)))
    .replace("{{status}}", escapeHtml(order.status || ""))
    .replace("{{createdAt}}", escapeHtml(formatDate(order.created_at)))
    .replace("{{updatedAt}}", escapeHtml(formatDateTime(order.updated_at)))
    .replace("{{clientName}}", escapeHtml(fullName || "—"))
    .replace("{{clientAddress}}", escapeHtml(address || "—"))
    .replace("{{clientEmail}}", escapeHtml(order.email || "—"))
    .replace("{{clientPhone}}", escapeHtml(order.phone || "—"))
    .replace("{{deliveryAddress}}", escapeHtml(order.delivery_address || "—"))
    .replace("{{note}}", escapeHtml(order.note || "—"))
    .replace(
      "{{obligatoryRows}}",
      obligatoryRows || '<tr><td colspan="4">Bez položek</td></tr>',
    )
    .replace("{{glassesSections}}", glassesSections || "")
    .replace(
      "{{paymentRows}}",
      paymentRows || '<tr><td colspan="3">Bez plateb</td></tr>',
    )
    .replace("{{totalAmount}}", formatCurrency(totalAmount))
    .replace("{{paidAmount}}", formatCurrency(paidAmount))
    .replace("{{remainingAmount}}", formatCurrency(remainingAmount));

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "12mm",
      right: "10mm",
      bottom: "12mm",
      left: "10mm",
    },
  });

  await browser.close();

  return {
    buffer,
    filename: `order-${buildOrderNumber(order) || order.id}.pdf`,
  };
}
