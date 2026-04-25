import React, { useEffect, useState } from 'react'
import {
  View,
  type StyleProp,
  type ImageStyle,
} from 'react-native'
import { Image } from 'expo-image'
import { placeholderFoodImageUrl } from '../../lib/recipeImage'

export default function RecipeCardImage({
  uri,
  style,
}: {
  uri: string | undefined
  style: StyleProp<ImageStyle>
}) {
  const [src, setSrc] = useState(uri ?? '')

  useEffect(() => {
    setSrc(uri ?? '')
  }, [uri])

  if (!src) {
    return <View style={[style, { backgroundColor: '#e8e8e8' }]} />
  }

  return (
    <Image
      recyclingKey={src.length > 200 ? src.slice(0, 200) : src}
      source={{ uri: src }}
      style={style}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
      onError={() => {
        setSrc((cur) => {
          if (cur.startsWith('https://image.pollinations.ai')) {
            return `https://picsum.photos/seed/${encodeURIComponent(cur.slice(-40))}/600/400`
          }
          if (cur.includes('picsum.photos')) return cur
          return placeholderFoodImageUrl('meal', 'food')
        })
      }}
    />
  )
}
