import OpenAI from "openai";

let _client: OpenAI | null = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  _client = new OpenAI({ apiKey });
  return _client;
}

/**
 * Transcribe an audio blob (Arabic) via OpenAI Whisper.
 * The caller is expected to provide a `File` with a sensible extension
 * (e.g. `audio/webm;codecs=opus` with filename "voice.webm").
 */
export async function transcribeArabic(file: File): Promise<string> {
  const openai = client();
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ar",
    response_format: "json",
  });
  return result.text;
}
