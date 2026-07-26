import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { destroyEducoreBotSafe, syncEducoreBot } from '../services/ragBot'

/**
 * Host-only RAG chatbot lifecycle.
 * Does not alter OAuth, JWT issuance, refresh cookies, or Directory redirect.
 */
function RagChatHost() {
  const { accessToken, isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (loading) {
      return undefined
    }

    let cancelled = false

    void (async () => {
      const result = await syncEducoreBot({
        accessToken,
        isAuthenticated,
      })
      if (cancelled && result?.status === 'initialized') {
        destroyEducoreBotSafe()
      }
    })()

    return () => {
      cancelled = true
      destroyEducoreBotSafe()
    }
  }, [accessToken, isAuthenticated, loading])

  useEffect(() => {
    const handlePageHide = () => {
      destroyEducoreBotSafe()
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  return <div id="edu-bot-container" />
}

export default RagChatHost
