import { GoogleGenerativeAI } from "@google/generative-ai"

function getImageModel(apiKey: string, modelId: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    } as object,
  })
}

function partToDataUri(part: { inlineData?: { mimeType?: string; data?: string } }): string | null {
  const mime = part.inlineData?.mimeType
  const data = part.inlineData?.data
  if (mime?.startsWith("image/") && data) return `data:${mime};base64,${data}`
  return null
}

function imageModelsToTry(): string[] {
  const fromEnv = process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL?.trim()
  const chain = [
    fromEnv,
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
  ].filter((m): m is string => Boolean(m))
  return [...new Set(chain)]
}

function extractImageFromResponse(response: unknown): string | null {
  const r = response as { candidates?: { content?: { parts?: unknown[] } }[] }
  const parts = r.candidates?.[0]?.content?.parts ?? []
  for (const part of parts as { inlineData?: { mimeType?: string; data?: string } }[]) {
    const uri = partToDataUri(part)
    if (uri) return uri
  }
  return null
}

async function generateImageWithModel(
  apiKey: string,
  modelId: string,
  prompt: string,
  onPartialImage?: (dataUri: string) => void
): Promise<string | null> {
  const imageModel = getImageModel(apiKey, modelId)

  // Stream first so partial image parts update the UI in real time.
  try {
    const { stream } = await imageModel.generateContentStream(prompt)
    let latest: string | null = null
    for await (const chunk of stream) {
      const uri = extractImageFromResponse(chunk as unknown)
      if (uri) {
        latest = uri
        onPartialImage?.(uri)
      }
    }
    if (latest) return latest
  } catch {
    /* fall through */
  }

  try {
    const result = await imageModel.generateContent(prompt)
    const uri = extractImageFromResponse(result.response as unknown)
    if (uri) {
      onPartialImage?.(uri)
      return uri
    }
  } catch {
    return null
  }

  return null
}

/**
 * Gemini native image for the food the user asked for. Tries current GA model first, then fallbacks.
 * Uses `EXPO_PUBLIC_GEMINI_API_KEY`. Optional `EXPO_PUBLIC_GEMINI_IMAGE_MODEL` overrides the first try only.
 */
export async function generateGeminiFoodImageStream(
  apiKey: string,
  recipeTitle: string,
  dishKeyword: string,
  onPartialImage?: (dataUri: string) => void,
  imageRequirements?: string
): Promise<string | null> {
  if (!apiKey) return null

  const userFood = dishKeyword.trim() || recipeTitle.trim() || "food"
  const title = (recipeTitle || userFood).trim() || userFood

  let prompt =
    `The user asked for food: "${userFood}". ` +
    `Generate exactly one photorealistic professional photograph of that dish (recipe context: "${title}"). ` +
    "Restaurant-style plating, natural soft light, shallow depth of field, appetizing. " +
    "No text, no watermark, no logos, no people, no hands. Focus on the food they requested."

  if (imageRequirements && imageRequirements.trim() !== '') {
    prompt += `\nAdditionally, absolutely strictly follow these user requirements for the image: "${imageRequirements.trim()}"`
  }

  for (const modelId of imageModelsToTry()) {
    const uri = await generateImageWithModel(apiKey, modelId, prompt, onPartialImage)
    if (uri) return uri
  }

  console.warn(
    "Gemini image: no model returned an image. Set EXPO_PUBLIC_GEMINI_IMAGE_MODEL in .env if your project uses a different image model."
  )
  return null
}
