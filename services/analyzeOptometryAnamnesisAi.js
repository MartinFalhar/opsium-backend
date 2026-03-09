const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function parseFindingsFromText(content) {
  if (!content || typeof content !== "string") return [];

  const rows = content
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  return rows.map((line) => ({ topic: "", impact: line }));
}

function normalizeFindings(findings) {
  if (!Array.isArray(findings)) return [];

  return findings
    .map((item) => ({
      topic: String(item?.topic ?? "").trim(),
      impact: String(item?.impact ?? "").trim(),
    }))
    .filter((item) => item.topic || item.impact)
    .slice(0, 12);
}

export async function analyzeOptometryAnamnesisAi(anamnesisText, userQuery = "") {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY není nastaven v backend prostředí.");
  }

  const hasUserQuery = !!String(userQuery).trim();

  const systemPrompt = hasUserQuery
    ? "Jsi oční lékař a biochemik. " +
      "Potřebuješ odborné informace z očního lékařství. " +
      "Odpovídej výhradně na dotaz uživatele a nedoplňuj kontext z anamnézy. " +
      "Ke každé nalezené relevantní věci napiš tři věty o dopadu na zdraví očí a vidění s ohledem na další vývoj. " +
      "Uveď diagnózu, navrhni terapii a dávkování. " +
      "Pokud dotaz neobsahuje dost dat, vrať jednu položku s topic='Nelze vyhodnotit' a krátkým důvodem. " +
      "Vrátíš pouze validní JSON bez markdownu ve tvaru: {\"findings\":[{\"topic\":\"...\",\"impact\":\"...\"}]}"
    : "Jsi oční lékař a biochemik. Vstup je anamnéza klienta v češtině. " +
      "Najdi onemocnění a léky a ke každé nalezené věci napiš velmi odborně pár vět o možném dopadu na zdraví očí, příčiny vzniku (biochemické aspekty) a konsekvence s daným onemocněním. " +
      "Piš diagnózu, uváděj terapii a podrobně zhodnoť další postup. " +
      "Vrátíš pouze validní JSON bez markdownu ve tvaru: {\"findings\":[{\"topic\":\"...\",\"impact\":\"...\"}]}";

  const userPrompt = hasUserQuery
    ? "Dotaz uživatele:\n" + userQuery
    : "Analyzuj následující text z modulu OptometryAnamnesis a zaměř se na onemocnění a zadané léky.\n\n" +
      anamnesisText;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const apiMessage = payload?.error?.message || "OpenAI request failed.";
    throw new Error(apiMessage);
  }

  const content = payload?.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(content);
    return normalizeFindings(parsed?.findings);
  } catch {
    return parseFindingsFromText(content);
  }
}
