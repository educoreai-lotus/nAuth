import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  destroyEducoreBotSafe,
  nextRagSyncGeneration,
  syncEducoreBot,
} from '../services/ragBot'

/**
 * Host-only RAG chatbot lifecycle.
 * Does not alter OAuth, JWT issuance, refresh cookies, or Directory redirect.
 * Guest mode activates only after auth loading completes and the visitor is unauthenticated.
 */
function RagChatHost() {
  const { accessToken, isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (loading) {
      return undefined
    }

    const syncToken = nextRagSyncGeneration()

    void syncEducoreBot({
      accessToken,
      isAuthenticated,
      syncToken,
    })

    return () => {
      // Stale cleanups must not destroy a newer effect's widget.
      destroyEducoreBotSafe({ ownerGeneration: syncToken })
    }
  }, [accessToken, isAuthenticated, loading])

  useEffect(() => {
    const handlePageHide = () => {
      destroyEducoreBotSafe({ force: true })
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  return <div id="edu-bot-container" />
}

export default RagChatHost
