import { useEffect } from 'react'

export function useDocumentTitle(judul) {
  useEffect(() => {
    const sebelumnya = document.title
    if (judul) document.title = judul
    return () => {
      document.title = sebelumnya
    }
  }, [judul])
}
