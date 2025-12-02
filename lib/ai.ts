import fetch from "node-fetch";

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

export async function summarizeWithGemini(text: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const prompt = `
Summarize the following text into a structured news summary with headings:
1. Headline / Title
2. Key Events / News Highlights
3. Political Updates
4. Economic Updates
5. International Relations
6. Miscellaneous / Other Important Notes

Text:
${text}
`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 5500,
          },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Gemini API Error Response:", error);
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data: GeminiResponse = (await res.json()) as GeminiResponse;

    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Summary not available";

    return summary;
  } catch (err) {
    console.error("Gemini error:", err);
    return "Summary could not be generated.";
  }
}
