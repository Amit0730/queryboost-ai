import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { query, dialect } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI API key not configured." },
        { status: 503 }
      );
    }

    const prompt = `
You are an expert SQL database administrator and performance tuning specialist.
Analyze the following SQL query (${dialect} dialect) and provide the following output in strict JSON format:
{
  "explanation": "A beginner-friendly explanation of what the query does. Break it into logical operations.",
  "performance_concerns": ["List of potential performance concerns or anti-patterns.", "Keep empty if none."],
  "optimization_suggestions": ["List of suggestions to improve the query.", "Keep empty if none."],
  "optimized_query": "An optimized version of the query if applicable, or null if no optimization is needed."
}

Do not include markdown blocks like \`\`\`json in your response, just the raw JSON object.
Ensure the JSON is well-formed.

Query:
${query}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let aiResultText = response.text;
    
    // Clean up potential markdown formatting from the response
    if (aiResultText?.startsWith("\`\`\`json")) {
      aiResultText = aiResultText.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "");
    }
    if (aiResultText?.startsWith("\`\`\`")) {
        aiResultText = aiResultText.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }

    const aiResult = JSON.parse(aiResultText || "{}");

    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to perform AI analysis." },
      { status: 500 }
    );
  }
}
