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
import fetch from "node-fetch";
import pool from "../db/index.js";

const h = React.createElement;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_FAMILY = "NotoSansCZ";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("cs-CZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeModuleValue(value) {
  if (typeof value === "number") {
    const normalized = value / 100;
    return Number.isInteger(normalized)
      ? String(normalized)
      : normalized.toFixed(2).replace(".", ",");
  }

  return safeText(value);
}

function parseExamData(rawData) {
  if (!rawData) return {};

  if (typeof rawData === "object") {
    return rawData;
  }

  if (typeof rawData === "string") {
    try {
      const parsed = JSON.parse(rawData);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function humanizeKey(key) {
  const direct = {
    S: "SPH",
    C: "CYL",
    A: "AX",
    Add: "ADD",
    P: "Prisma",
    B: "Báze",
    V: "Visus",
    IOT: "IOT",
    COR: "COR",
    CCT: "CCT",
    AN: "AN",
    AT: "AT",
    R: "Recovery",
    name: "Název",
    text: "Poznámka",
    style: "Styl",
  };

  return direct[key] || key;
}

function splitEyeKey(fieldKey) {
  if (!fieldKey) {
    return { eye: "other", base: "" };
  }

  const normalized = String(fieldKey);
  const first = normalized.charAt(0);

  if (first === "p") {
    return { eye: "right", base: normalized.slice(1) || normalized };
  }

  if (first === "l") {
    return { eye: "left", base: normalized.slice(1) || normalized };
  }

  if (first === "b") {
    return { eye: "bino", base: normalized.slice(1) || normalized };
  }

  return { eye: "other", base: normalized };
}

function toModuleRows(examDataObject) {
  const entries = Object.entries(examDataObject || {});

  return entries
    .map(([moduleKey, values]) => {
      const parts = moduleKey.split("-");
      const order = Number(parts[0] ?? 9999);
      const moduleValues = values && typeof values === "object" ? values : {};
      const label = safeText(moduleValues.name).trim() || `Modul ${moduleKey}`;

      const rowsMap = new Map();

      Object.entries(moduleValues)
        .filter(([key]) => key !== "name")
        .forEach(([fieldKey, fieldValue]) => {
          const { eye, base } = splitEyeKey(fieldKey);
          const rowKey = base || fieldKey;

          if (!rowsMap.has(rowKey)) {
            rowsMap.set(rowKey, {
              parameter: humanizeKey(base || fieldKey),
              right: "",
              left: "",
              bino: "",
              other: "",
            });
          }

          const row = rowsMap.get(rowKey);
          const value = normalizeModuleValue(fieldValue);

          if (eye === "right") row.right = value;
          else if (eye === "left") row.left = value;
          else if (eye === "bino") row.bino = value;
          else row.other = value;
        });

      return {
        moduleKey,
        order,
        label,
        rows: [...rowsMap.values()],
        rawValues: moduleValues,
      };
    })
    .sort((a, b) => a.order - b.order);
}

function parseDecimal(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(",", ".").replace(/[^0-9+\-.]/g, "");
  const num = Number(normalized);
  return Number.isNaN(num) ? null : num;
}

function findRefractionContext(modules) {
  const refractionCandidate =
    modules.find((m) => /pln|refrakce/i.test(m.label) && m.rawValues?.pS) ||
    modules.find((m) => m.rawValues?.pS && m.rawValues?.lS) ||
    null;

  const visusCandidate =
    modules.find((m) => /visus/i.test(m.label)) ||
    modules.find((m) => m.rawValues?.pV || m.rawValues?.lV || m.rawValues?.bV) ||
    null;

  const ref = refractionCandidate?.rawValues || {};
  const vis = visusCandidate?.rawValues || {};

  return {
    right: {
      sph: normalizeModuleValue(ref.pS),
      cyl: normalizeModuleValue(ref.pC),
      ax: normalizeModuleValue(ref.pA),
      add: normalizeModuleValue(ref.pAdd),
      visus: normalizeModuleValue(vis.pV || ref.pV),
    },
    left: {
      sph: normalizeModuleValue(ref.lS),
      cyl: normalizeModuleValue(ref.lC),
      ax: normalizeModuleValue(ref.lA),
      add: normalizeModuleValue(ref.lAdd),
      visus: normalizeModuleValue(vis.lV || ref.lV),
    },
    binoVisus: normalizeModuleValue(vis.bV || ref.bV),
    addNumeric: {
      right: parseDecimal(ref.pAdd),
      left: parseDecimal(ref.lAdd),
    },
  };
}

async function buildAiClinicalSummary(modules) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return "AI klinický závěr není dostupný, protože v backendu není nastaven OPENAI_API_KEY.";
  }

  const context = findRefractionContext(modules);

  const systemPrompt =
    "Jsi optometrický asistent. Dostaneš strukturovaná data refrakce. Vyber pro svou analýzu pouze jeden blok dat, a to ten který má první slovo Refrakce ve svém názvu. " +
    "Napiš přesný, srozumitelný text pro klienta v češtině: " +
    "1) jaká refrakční vada vyplývá z hodnot, " +
    "2) jaká je zraková ostrost (pravé, levé, bino), " +
    "3) co lze očekávat vzhledem k hodnotě ADD. " +
    "4) jaký bude dopad na zvykání s ohledem na anizeikonii. " +
    "5) jaký bude dopad na centrování brýlových čoček. " +
    "Buď věcný, bez diagnózy, bez návrhu léčby. " +
    "Výstup max 6 krátkých vět v prostém textu bez odrážek.";

  const userPrompt =
    "Data vyšetření (JSON):\n" + JSON.stringify(context, null, 2);
console.log("Prompt pro AI:",   context);
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return "AI klinický závěr není k dispozici (chyba AI služby).";
    }

    const summary = safeText(payload?.choices?.[0]?.message?.content).trim();

    if (!summary) {
      return "AI klinický závěr nebyl vygenerován.";
    }

    return summary;
  } catch {
    return "AI klinický závěr není k dispozici (chyba při komunikaci).";
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    lineHeight: 1.35,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: 6,
  },
  label: {
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bfbfbf",
    borderBottomStyle: "solid",
    paddingBottom: 3,
    marginTop: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
    borderBottomStyle: "solid",
    paddingTop: 2,
    paddingBottom: 2,
  },
  colParam: {
    width: "28%",
    paddingRight: 4,
    fontWeight: 700,
  },
  colRight: {
    width: "18%",
    paddingRight: 4,
  },
  colLeft: {
    width: "18%",
    paddingRight: 4,
  },
  colBino: {
    width: "18%",
    paddingRight: 4,
  },
  colOther: {
    width: "18%",
  },
  moduleTitle: {
    fontWeight: 700,
    marginBottom: 2,
  },
  muted: {
    color: "#666666",
  },
  summaryText: {
    fontSize: 9,
    lineHeight: 1.45,
  },
});

function KeyValue({ label, value }) {
  return h(
    View,
    { style: styles.row },
    h(Text, { style: styles.label }, `${label}:`),
    h(Text, null, safeText(value) || "—"),
  );
}

function ModuleTable({ module }) {
  return h(
    View,
    { style: [styles.card, { marginBottom: 6 }] },
    h(Text, { style: styles.moduleTitle }, `${module.label} (${module.moduleKey})`),
    h(
      View,
      { style: styles.tableHeader },
      h(Text, { style: styles.colParam }, "Parametr"),
      h(Text, { style: styles.colRight }, "Pravé oko"),
      h(Text, { style: styles.colLeft }, "Levé oko"),
      h(Text, { style: styles.colBino }, "Bino"),
      h(Text, { style: styles.colOther }, "Jiné"),
    ),
    ...(module.rows.length > 0
      ? module.rows.map((row, index) =>
          h(
            View,
            { key: `${module.moduleKey}-row-${index}`, style: styles.tableRow },
            h(Text, { style: styles.colParam }, safeText(row.parameter) || "—"),
            h(Text, { style: styles.colRight }, safeText(row.right) || "—"),
            h(Text, { style: styles.colLeft }, safeText(row.left) || "—"),
            h(Text, { style: styles.colBino }, safeText(row.bino) || "—"),
            h(Text, { style: styles.colOther }, safeText(row.other) || "—"),
          ),
        )
      : [h(Text, { key: `${module.moduleKey}-empty`, style: styles.muted }, "Bez vyplněných hodnot")]),
  );
}

function ExamDocument({ exam, client, modules, aiSummary }) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.title }, "Optometrické vyšetření"),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Identifikace vyšetření"),
        h(KeyValue, { label: "Název", value: exam.name }),
        h(KeyValue, { label: "Klient ID", value: exam.client_id }),
        h(KeyValue, { label: "Pobočka ID", value: exam.branch_id }),
        h(KeyValue, { label: "Vytvořeno", value: formatDate(exam.created_at) }),
      ),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "Klient"),
        h(KeyValue, {
          label: "Jméno",
          value: [client.degree_before, client.name, client.surname, client.degree_after]
            .filter(Boolean)
            .join(" "),
        }),
        h(KeyValue, {
          label: "Datum narození",
          value: client.birth_date ? formatDate(client.birth_date) : "",
        }),
      ),
      h(Text, { style: [styles.sectionTitle, { marginBottom: 4 }] }, "Formulář modulů optometrie"),
      ...(modules.length > 0
        ? modules.map((module) => h(ModuleTable, { key: module.moduleKey, module }))
        : [
            h(
              View,
              { key: "no-modules", style: styles.card },
              h(Text, { style: styles.muted }, "Vyšetření neobsahuje uložená modulová data."),
            ),
          ]),
      h(
        View,
        { style: styles.card },
        h(Text, { style: styles.sectionTitle }, "AI klinický závěr"),
        h(Text, { style: styles.summaryText }, aiSummary),
      ),
    ),
  );
}

export async function generateExamPdf({ clientId, examName, branchId }) {
  const normalizedClientId = Number(clientId);
  const normalizedExamName = safeText(examName).trim();
  const normalizedBranchId = Number(branchId);

  if (!Number.isFinite(normalizedClientId) || normalizedClientId <= 0) {
    throw new Error("Neplatné ID klienta.");
  }

  if (!normalizedExamName) {
    throw new Error("Název vyšetření je povinný.");
  }

  if (!Number.isFinite(normalizedBranchId) || normalizedBranchId <= 0) {
    throw new Error("Neplatná pobočka.");
  }

  const examResult = await pool.query(
    `SELECT id, client_id, branch_id, name, data, created_at
       FROM examinations
      WHERE client_id = $1
        AND branch_id = $2
        AND name = $3
      ORDER BY id DESC
      LIMIT 1`,
    [normalizedClientId, normalizedBranchId, normalizedExamName],
  );

  if (examResult.rows.length === 0) {
    throw new Error("Vyšetření nebylo nalezeno.");
  }

  const clientResult = await pool.query(
    `SELECT id, degree_before, name, surname, degree_after, birth_date
       FROM clients
      WHERE id = $1
      LIMIT 1`,
    [normalizedClientId],
  );

  const exam = examResult.rows[0];
  const client = clientResult.rows[0] || {};

  const examDataObject = parseExamData(exam.data);
  const modules = toModuleRows(examDataObject);
  const aiSummary = await buildAiClinicalSummary(modules);

  const document = h(ExamDocument, {
    exam,
    client,
    modules,
    aiSummary,
  });

  const stream = await pdf(document).toBuffer();
  const buffer = await streamToBuffer(stream);

  const safeExamPart = normalizedExamName
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  return {
    buffer,
    filename: `exam-${normalizedClientId}-${safeExamPart || "report"}.pdf`,
  };
}
