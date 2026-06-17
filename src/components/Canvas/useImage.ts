import { useEffect, useState } from 'react'

/** Carrega um src em HTMLImageElement para uso no Konva. */
export function useImage(src: string | null): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement>()
  useEffect(() => {
    if (!src) {
      setImg(undefined)
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let alive = true
    image.onload = () => {
      if (alive) setImg(image)
    }
    image.src = src
    return () => {
      alive = false
    }
  }, [src])
  return img
}
