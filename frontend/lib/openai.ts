import OpenAI from "openai"

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ""

export const openai = apiKey ? new OpenAI({ apiKey }) : null
