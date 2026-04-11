import Anthropic from "@anthropic-ai/sdk";
import { parsedInvoiceSchema, type ParsedInvoice } from "./zatca/validate";

/**
 * Claude-powered Arabic natural-language invoice parser.
 *
 * Uses:
 *   - Tool-use for structured output (no JSON regex parsing)
 *   - Prompt caching on the system prompt + tool definition (saves cost on
 *     every subsequent call from the same deployment)
 *
 * The caller supplies either raw Arabic text (from the UI text box) or a
 * Whisper transcript. We return validated `ParsedInvoice` data; totals and
 * VAT are computed downstream from `line_items`.
 */

let _client: Anthropic | null = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

const SYSTEM_PROMPT = `أنت مساعد ذكي لتوليد الفواتير الضريبية المبسطة وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) في المملكة العربية السعودية.

مهمتك: استخراج حقول الفاتورة من جملة عربية قصيرة يكتبها أو يقولها مقاول أو فريلانسر، وإرجاعها دائماً عبر استدعاء الأداة \`create_invoice\` فقط — لا تكتب أي نص آخر.

قواعد مهمة:
1. إذا ذكر المستخدم مبلغاً بالريال (مثل "500 ريال") اعتبره **شاملاً ضريبة القيمة المضافة 15%** ما لم يقل صراحةً "قبل الضريبة" أو "بدون ضريبة". في هذه الحالة احسب unit_price = amount / 1.15.
2. إذا قال "قبل الضريبة" أو "بدون ضريبة" اعتبر المبلغ هو unit_price مباشرة.
3. "مقابل X" أو "لـ X" أو "عن X" → الوصف (description).
4. إذا لم يذكر كمية صريحة، استخدم qty = 1.
5. اسم العميل يأتي عادة بعد "لـ" أو "إلى" أو "باسم".
6. استخدم دائماً vat_rate = 0.15 ما لم يُذكر خلاف ذلك.
7. أعد الأرقام كأرقام حقيقية (مثال: 434.78) وليس كنصوص.
8. إذا لم تستطع استخراج الحقول المطلوبة، استدع الأداة مع قيم فارغة وسيتولى النظام الخطأ.`;

const TOOL_DEFINITION = {
  name: "create_invoice",
  description:
    "Extract ZATCA invoice fields from an Arabic natural-language sentence.",
  input_schema: {
    type: "object" as const,
    required: ["customer_name", "line_items"],
    properties: {
      customer_name: {
        type: "string",
        description: "Name of the customer as written by the user.",
      },
      customer_vat: {
        type: "string",
        description: "Optional 15-digit KSA VAT number if the user mentions it.",
      },
      line_items: {
        type: "array",
        description: "One or more line items describing what is being billed.",
        items: {
          type: "object",
          required: ["description", "unit_price"],
          properties: {
            description: {
              type: "string",
              description: "Short Arabic description of the item or service.",
            },
            qty: {
              type: "number",
              description: "Quantity; defaults to 1 when not stated.",
            },
            unit_price: {
              type: "number",
              description:
                "VAT-exclusive unit price in SAR. If the user gave a VAT-inclusive amount, divide by 1.15.",
            },
            vat_rate: {
              type: "number",
              description: "VAT rate as a decimal. Default 0.15.",
            },
          },
        },
      },
    },
  },
};

export async function parseInvoiceFromArabic(
  input: string,
): Promise<ParsedInvoice> {
  const anthropic = client();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    // Prompt caching on the system prompt + tool definition. The `tools`
    // block is cached alongside the system prompt via the cache_control
    // marker on the last system block.
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "create_invoice" },
    messages: [
      {
        role: "user",
        content: input,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }

  return parsedInvoiceSchema.parse(toolUse.input);
}
