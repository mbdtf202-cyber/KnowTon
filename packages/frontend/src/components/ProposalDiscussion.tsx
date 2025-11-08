import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'

interface Comment {
  id: string
  proposalId: string
  author: string
  authorAddress: string
  content: string
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface ProposalDiscussionProps {
  proposalId: string
}

export default function ProposalDiscussion({ proposalId }: ProposalDiscussionProps) {
  const { t } = useTranslation()
  const { address, isConnected } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
  }, [proposalId])

  const loadComments = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/api/v1/governance/proposals/${proposalId}/comments`)
      setComments(response.data.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
      // Use mock data for now
      setComments([
        {
          id: '1',
          proposalId,
          author: 'Alice',
          authorAddress: '0x1234567890abcdef',
          content: 'I support this proposal. It will help reduce costs for all users.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          replies: [
            {
              id: '2',
              proposalId,
              author: 'Bob',
              authorAddress: '0xabcdef1234567890',
              content: 'Agreed! This is a step in the right direction.',
              createdAt: new Date(Date.now() - 1800000).toISOString(),
              updatedAt: new Date(Date.now() - 1800000).toISOString(),
            },
          ],
        },
        {
          id: '3',
          proposalId,
          author: 'Charlie',
          authorAddress: '0x9876543210fedcba',
          content:
            'I have some concerns about the implementation timeline. Can we extend it by 2 weeks?',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isConnected) return

    setIsSubmitting(true)
    try {
      await api.post(`/api/v1/governance/proposals/${proposalId}/comments`, {
        content: newComment,
        authorAddress: address,
      })
      setNewComment('')
      await loadComments()
    } catch (error) {
      console.error('Failed to submit comment:', error)
      // Mock success for now
      const mockComment: Comment = {
        id: String(Date.now()),
        proposalId,
        author: 'You',
        authorAddress: address || '',
        content: newComment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setComments([...comments, mockComment])
      setNewComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !isConnected) return

    setIsSubmitting(true)
    try {
      await api.post(`/api/v1/governance/proposals/${proposalId}/comments/${parentId}/replies`, {
        content: replyContent,
        authorAddress: address,
      })
      setReplyContent('')
      setReplyTo(null)
      await loadComments()
    } catch (error) {
      console.error('Failed to submit reply:', error)
      // Mock success for now
      const mockReply: Comment = {
        id: String(Date.now()),
        proposalId,
        author: 'You',
        authorAddress: address || '',
        content: replyContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setComments(
        comments.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), mockReply] } : c
        )
      )
      setReplyContent('')
      setReplyTo(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return t('governance.justNow')
    if (seconds < 3600) return t('governance.minutesAgo', { count: Math.floor(seconds / 60) })
    if (seconds < 86400) return t('governance.hoursAgo', { count: Math.floor(seconds / 3600) })
    return t('governance.daysAgo', { count: Math.floor(seconds / 86400) })
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
            {comment.author[0].toUpperCase()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">{comment.author}</span>
              <span className="text-xs text-gray-500 font-mono">
                {comment.authorAddress.slice(0, 6)}...{comment.authorAddress.slice(-4)}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          {!isReply && isConnected && (
            <button
              onClick={() => setReplyTo(comment.id)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('governance.reply')}
            </button>
          )}

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('governance.writeReply')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyContent.trim() || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? t('governance.submitting') : t('governance.submitReply')}
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null)
                    setReplyContent('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('governance.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      {isConnected ? (
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('governance.shareThoughts')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? t('governance.submitting') : t('governance.postComment')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-800">
            {t('governance.connectToComment')}
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-medium">
              {comments.length} {t('governance.comments')}
            </span>
          </div>
          {comments.map((comment) => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-gray-600 text-sm">{t('governance.noComments')}</p>
          <p className="text-gray-500 text-xs mt-1">{t('governance.beFirstToComment')}</p>
        </div>
      )}
    </div>
  )
}
