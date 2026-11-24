/**
 * Wrappers TanStack Query pour le module docs.
 * - `useDocsQuery`    : defaults (staleTime, retry non-agressif)
 * - `useDocsMutation` : toast automatique sur erreur, opt-out via onError custom
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isNonRetryableError, getDocsErrorMessage } from '../../lib/docsErrors'

/**
 * @param {import('@tanstack/react-query').UseQueryOptions} options
 */
export const useDocsQuery = (options) =>
  useQuery({
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (isNonRetryableError(error)) return false
      return failureCount < 2
    },
    ...options,
  })

/**
 * Mutation docs.
 * Par défaut : toast erreur. Passe `onError` explicite pour override.
 * @param {import('@tanstack/react-query').UseMutationOptions} options
 */
export const useDocsMutation = (options = {}) => {
  const { onError: customOnError, ...rest } = options
  return useMutation({
    ...rest,
    onError: (error, vars, ctx) => {
      if (typeof customOnError === 'function') {
        customOnError(error, vars, ctx)
        return
      }
      toast.error(getDocsErrorMessage(error))
    },
  })
}