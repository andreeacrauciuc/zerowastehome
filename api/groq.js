/* global process, Buffer */
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string" && req.body.trim() !== "") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return res
      .status(400)
      .json({ error: "Invalid request body: expected { model, messages }" });
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: "Upstream returned a non-JSON response", raw: text.slice(0, 500) };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    // error
    console.error("api/groq: failed to reach Groq API", error);
    return res
      .status(502)
      .json({ error: "Failed to reach Groq API", detail: String(error?.message || error) });
  }
}
