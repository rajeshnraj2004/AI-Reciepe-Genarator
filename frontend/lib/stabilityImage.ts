/**
 * Stability AI – Text-to-Image for food photos.
 *
 * Uses the v1 generation endpoint which is stable and widely supported.
 * Falls back gracefully to a placeholder on any failure.
 */

const STABILITY_API_KEY = process.env.EXPO_PUBLIC_STABILITY_API_KEY ?? ""

// Engine IDs that work with the v1 endpoint:
//   "stable-diffusion-xl-1024-v1-0"         – SDXL (best quality, ~5-8s)
//   "stable-diffusion-3-large-turbo-2024-06-25" – SD3 Turbo (fast, ~1-2s)
const STABILITY_ENGINE =
  process.env.EXPO_PUBLIC_STABILITY_ENGINE ??
  "stable-diffusion-xl-1024-v1-0"

const STABILITY_API_BASE = "https://api.stability.ai/v1/generation"

// ---------- helpers ----------

/** Build a food-photography prompt. */
function buildPrompt(
  dishName: string,
  keywords: string,
  styleHint?: string
): string {
  const style = styleHint
    ? `, ${styleHint} food photography style`
    : ", professional food photography style"
  return (
    `Professional food photography of ${dishName}, ` +
    `delicious ${keywords}${style}, ` +
    `appetizing, studio lighting, shallow depth of field, ` +
    `on a clean ceramic plate, beautifully garnished, ` +
    `warm tones, 8k, ultra detailed, photorealistic`
  )
}

/** Retry on 429 (rate-limit) or 503. */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 4000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options)

    if (res.ok) return res

    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const wait = delayMs * (attempt + 1)
      console.log(
        `[Stability] ${res.status}, retry ${attempt + 1}/${retries} in ${wait / 1000}s…`
      )
      await new Promise((r) => setTimeout(r, wait))
      continue
    }

    return res
  }
  return new Response(null, { status: 503 })
}

// ---------- public API ----------

/**
 * Generate a food image via Stability AI v1 text-to-image.
 *
 * @returns A base-64 data-URI string, or `null` on failure.
 */
export async function generateFoodImage(
  dishName: string,
  keywords: string,
  styleHint?: string,
  onPreview?: (uri: string | null) => void
): Promise<string | null> {
  if (!STABILITY_API_KEY) {
    console.warn(
      "[Stability] EXPO_PUBLIC_STABILITY_API_KEY not set – skipping image generation"
    )
    return null
  }

  try {
    const prompt = buildPrompt(dishName, keywords, styleHint)
    console.log("[Stability] Engine:", STABILITY_ENGINE)
    console.log("[Stability] Prompt:", prompt)

    const url = `${STABILITY_API_BASE}/${STABILITY_ENGINE}/text-to-image`

    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: "blurry, bad quality, distorted, ugly, cartoon, drawing", weight: -1 },
          ],
          cfg_scale: 7,
          width: 1024,
          height: 1024,
          steps: 30,
          samples: 1,
        }),
      },
      3,
      5000
    )

    if (!response.ok) {
      let detail = ""
      try {
        const errBody = await response.json()
        detail =
          (errBody as any)?.message ||
          (errBody as any)?.name ||
          JSON.stringify(errBody)
      } catch {
        detail = response.statusText || `HTTP ${response.status}`
      }
      console.error(`[Stability] API error ${response.status}:`, detail)

      if (response.status === 401) {
        console.error("[Stability] Invalid API key")
      } else if (response.status === 403) {
        console.error("[Stability] No credits or wrong engine for your plan")
      } else if (response.status === 404) {
        console.error(
          `[Stability] Engine "${STABILITY_ENGINE}" not found – set EXPO_PUBLIC_STABILITY_ENGINE in .env`
        )
      }

      return null
    }

    // v1 returns JSON: { artifacts: [{ base64, seed, finishReason }] }
    const json = (await response.json()) as {
      artifacts?: { base64?: string; finishReason?: string }[]
    }

    if (!json.artifacts?.length || !json.artifacts[0].base64) {
      console.error("[Stability] No image in response:", JSON.stringify(json).slice(0, 200))
      return null
    }

    if (json.artifacts[0].finishReason !== "SUCCESS") {
      console.warn(
        "[Stability] finishReason:",
        json.artifacts[0].finishReason
      )
    }

    const dataUri = `data:image/png;base64,${json.artifacts[0].base64}`

    onPreview?.(dataUri)
    return dataUri
  } catch (err) {
    console.error("[Stability] Image generation error:", err)
    return null
  }
}

/**
 * Fallback placeholder – shown when Stability generation fails.
 */
export function placeholderFoodImageUrl(
  title: string,
  _keywords: string
): string {
  const label = encodeURIComponent(title || "Food")
  return `https://placehold.co/1024x1024/1a1a2e/ffffff?text=${label}&font=roboto`
}