import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CheckoutResult, SignedCallback } from '@/lib/types'

/** Starts a checkout: enrols directly for free courses, returns a payment order otherwise. */
export function useStartCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => api.post<CheckoutResult>(`/courses/${courseId}/checkout`),
    onSuccess: (result) => {
      if (result.type === 'enrolled') void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

/** Sends the signed checkout callback to the server, which verifies it before enrolling. */
export function useVerifyPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (callback: SignedCallback) => api.post<{ courseId: string; alreadyProcessed: boolean }>('/payments/verify', callback),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['course'] })
    },
  })
}
