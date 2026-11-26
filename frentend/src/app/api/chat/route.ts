import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getProducts } from "@/lib/api";

const searchProductsTool = {
  name: "search_products",
  description:
    "البحث عن المنتجات في قاعدة بيانات المتجر ومعرفة الأسعار والكمية المتوفرة والعروض.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "اسم المنتج أو الكلمة المفتاحية للبحث",
      },
    },
    required: ["query"],
  },
};

const systemInstruction = `
أنت المستشار الذكي ومساعد المبيعات في متجر "المخازن الاقتصادية".
- أجب بنفس لغة العميل (العربية أو الإنجليزية) بأسلوب ودود ومختصر ومفيد.
- استخدم أداة search_products دائماً عندما يسأل العميل عن منتج أو سعر أو توفر أو عرض.
- اعتمد فقط على البيانات العائدة من الأداة ولا تخترع أسعاراً أو منتجات غير موجودة.
- اذكر السعر بالريال السعودي (ر.س) ووضّح هل المنتج متوفر أم لا.
`;

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
] as const;

async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">,
) {
  let lastError: unknown;
  for (const model of MODELS) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مضبوط في السيرفر حالياً." },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const { messages } = await req.json();

    // Gemini requires the conversation to start with a "user" turn — strip any
    // leading welcome message from the model before sending.
    const normalizedMessages = Array.isArray(messages) ? [...messages] : [];
    while (normalizedMessages.length > 0 && normalizedMessages[0]?.role !== "user") {
      normalizedMessages.shift();
    }

    let response = await generateWithFallback(ai, {
      contents: normalizedMessages,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [searchProductsTool] }],
      },
    });

    let foundProducts: Array<{
      id: number;
      name: string;
      name_en?: string | null;
      price: string;
      regular_price: string;
      on_sale: boolean;
      in_stock: boolean;
      image: string | null;
    }> = [];

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];

      if (call.name === "search_products") {
        const query = String(call.args?.query || "").trim();
        const products = await getProducts({ search: query, perPage: 6 });

        foundProducts = products.map((p) => ({
          id: p.id,
          name: p.name,
          name_en: p.name_en,
          price: p.price,
          regular_price: p.regular_price,
          on_sale: p.on_sale,
          in_stock: p.stock_status !== "outofstock",
          image: p.images?.[0]?.src || null,
        }));

        const productsData = products.map((p) => ({
          id: p.id,
          name: p.name,
          name_en: p.name_en,
          price: p.price,
          regular_price: p.regular_price,
          on_sale: p.on_sale,
          in_stock: p.stock_status !== "outofstock",
          stock_quantity: p.stock_quantity,
          url: `/product/${p.id}`,
        }));

        response = await generateWithFallback(ai, {
          contents: [
            ...normalizedMessages,
            response.candidates![0].content,
            {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: { results: productsData },
                  },
                },
              ],
            },
          ],
          config: { systemInstruction },
        });
      }
    }

    return NextResponse.json({
      reply: response.text || "عذراً، لم أتمكن من صياغة رد حالياً. حاول مرة أخرى.",
      products: foundProducts,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { reply: "حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
