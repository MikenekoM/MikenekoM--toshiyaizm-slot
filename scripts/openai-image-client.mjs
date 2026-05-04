const OPENAI_IMAGE_GENERATION_URL = "https://api.openai.com/v1/images/generations";

export const imagePromptMaxLength = 1200;

const defaultImageOptions = {
  model: "gpt-image-2",
  size: "1024x1024",
  quality: "low",
  n: 1,
  output_format: "png",
};

const allowedSizes = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const allowedQualities = new Set(["low", "medium", "high", "auto"]);

export class PublicOpenAIImageError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "PublicOpenAIImageError";
    this.statusCode = statusCode;
  }
}

export function readOpenAIApiKeyFromEnv(env = process.env) {
  const apiKey = String(env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new PublicOpenAIImageError(
      "OPENAI_API_KEY が未設定です。ローカル起動補助スクリプトを使うか、環境変数を設定してください。",
      500,
    );
  }
  return apiKey;
}

export function validateImagePrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    throw new PublicOpenAIImageError("画像生成の入力文を入力してください。", 400);
  }
  if (normalizedPrompt.length > imagePromptMaxLength) {
    throw new PublicOpenAIImageError(
      `画像生成の入力文は${imagePromptMaxLength}文字以内にしてください。`,
      400,
    );
  }
  return normalizedPrompt;
}

function normalizeImageOptions(options = {}) {
  const size = allowedSizes.has(options.size) ? options.size : defaultImageOptions.size;
  const quality = allowedQualities.has(options.quality) ? options.quality : defaultImageOptions.quality;
  return {
    ...defaultImageOptions,
    size,
    quality,
  };
}

function messageForOpenAIStatus(status) {
  if (status === 400) return "画像生成の入力文または設定を確認してください。";
  if (status === 401 || status === 403) return "OpenAI APIキーまたは利用権限を確認してください。";
  if (status === 429) return "OpenAI APIの利用制限に達しました。少し待ってから再試行してください。";
  if (status >= 500) return "OpenAI API側で一時的な問題が発生しています。少し待ってから再試行してください。";
  return "画像生成に失敗しました。";
}

export function createOpenAIImageClient({
  apiKey = readOpenAIApiKeyFromEnv(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new PublicOpenAIImageError("このNode.js環境では fetch が使えません。Node.js 18以上で起動してください。");
  }

  return {
    async generateImage({ prompt, size, quality } = {}) {
      const safePrompt = validateImagePrompt(prompt);
      const options = normalizeImageOptions({ size, quality });

      let response;
      try {
        response = await fetchImpl(OPENAI_IMAGE_GENERATION_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            prompt: safePrompt,
            size: options.size,
            quality: options.quality,
            n: options.n,
            output_format: options.output_format,
          }),
        });
      } catch {
        throw new PublicOpenAIImageError(
          "OpenAI APIに接続できませんでした。ネットワーク接続を確認してください。",
          502,
        );
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new PublicOpenAIImageError(messageForOpenAIStatus(response.status), response.status);
      }

      const imageBase64 = payload?.data?.[0]?.b64_json;
      if (!imageBase64) {
        throw new PublicOpenAIImageError("OpenAI APIから画像データを取得できませんでした。", 502);
      }

      return {
        imageBase64,
        mimeType: "image/png",
        model: options.model,
        size: options.size,
        quality: options.quality,
      };
    },
  };
}
