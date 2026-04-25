import { generateGeminiFoodImageStream } from "./geminiImage"
import { openai } from "./openai"

/** Free prompt-to-image URL (no API key). Replaces deprecated source.unsplash.com. */
function pollinationsFoodImageUrl(recipeTitle: string, dishKeyword: string): string {
  const title = (recipeTitle || dishKeyword).trim() || "food"
  const dish = dishKeyword.trim() || title
  const prompt =
    `professional food photograph, ${title}, ${dish}, restaurant plating, ` +
    "natural soft light, shallow depth of field, appetizing, no text, no watermark"
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true`
}

export function placeholderFoodImageUrl(recipeTitle: string, dishKeyword?: string): string {
  return pollinationsFoodImageUrl(recipeTitle, dishKeyword ?? recipeTitle)
}

/**
 * 1) Gemini native image (same key as recipe text; streaming with optional partial callback).
 * 2) OpenAI DALL·E 3 if configured.
 */
export async function generateRecipeFoodImage(
  recipeTitle: string,
  dishKeyword: string,
  onGeminiPartialImage?: (dataUri: string) => void,
  imageRequirements?: string
): Promise<string | null> {
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ""
  if (geminiKey) {
    const fromGemini = await generateGeminiFoodImageStream(
      geminiKey,
      recipeTitle,
      dishKeyword,
      onGeminiPartialImage,
      imageRequirements
    )
    if (fromGemini) return fromGemini
  }

  if (!openai) return null

  const title = (recipeTitle || dishKeyword).trim() || dishKeyword
  let prompt =
    `Professional food photograph of "${title}" (${dishKeyword}). ` +
    "Restaurant plating, appetizing, natural soft light, shallow depth of field. " +
    "No text, no watermark, no hands, no faces."

  if (imageRequirements && imageRequirements.trim() !== '') {
    prompt += `\nAdditionally, absolutely strictly follow these user requirements for the image: "${imageRequirements.trim()}"`
  }

  try {
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    })

    const row = res.data?.[0]
    if (row?.b64_json) return `data:image/png;base64,${row.b64_json}`
    if (row?.url) return row.url
  } catch (e) {
    console.warn("OpenAI image generation failed:", e)
  }

  return null
}
