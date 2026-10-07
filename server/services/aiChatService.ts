import { GoogleGenerativeAI } from '@google/generative-ai';

/** Read lazily so dotenv has loaded before first request */
function getGenAI() {
  const key = process.env.GEMINI_API_KEY || '';
  return key ? new GoogleGenerativeAI(key) : null;
}

const SYSTEM_PROMPT = `You are a helpful assistant for Tailor Fit, a custom clothing platform in Pakistan offering bespoke shirts, suits, pants, and more.

You can help with:
- Sizing and measurements (how to measure, size guides)
- Fabric choices (cotton, linen, poplin, best for season/occasion)
- Customization process (how it works, what options are available)
- Order status and delivery (tracking, typical timelines)
- General fashion and tailoring advice for custom clothing
- Prices are in PKR (Pakistani Rupees)

If a customer needs to speak to a human (complex orders, complaints, returns, payment issues), suggest they click "Talk to a human" to connect with our support team.

Keep replies concise (2-4 sentences). Be friendly and professional. Use PKR for any prices.`;

export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

export async function getGeminiResponse(
  userMessage: string,
  history: ChatTurn[]
): Promise<{ text: string; tokensUsed?: number }> {
  const genAI = getGenAI();
  if (!genAI) {
    return {
      text: 'AI assistant is temporarily unavailable. Please click "Talk to a human" to connect with our support team.',
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const recentHistory = history.slice(-10);
    const contentParts: string[] = [];

    for (const turn of recentHistory) {
      contentParts.push(`${turn.role === 'user' ? 'Customer' : 'Assistant'}: ${turn.content}`);
    }
    contentParts.push(`Customer: ${userMessage}`);

    const prompt = contentParts.join('\n\n');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text()?.trim() || 'I could not generate a response. Please try again or contact our support team.';

    const usage = (response as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
    const tokensUsed = usage?.totalTokenCount;

    return { text, tokensUsed };
  } catch (err) {
    console.error('[AI Chat] Gemini error:', err);
    return {
      text: 'I encountered an error. Please click "Talk to a human" to connect with our support team.',
    };
  }
}
