import { useMutation } from '@tanstack/react-query'
import { MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'

/** Reminds a signed-in user with an unconfirmed email that enrolment needs it. */
export function VerifyEmailBanner() {
  const { user } = useAuth()
  const resend = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/resend-verification'),
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(errorMessage(error)),
  })
  if (!user || user.isEmailVerified) return null
  return (
    <div className="border-b border-marigold/40 bg-marigold-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm sm:px-6">
        <MailWarning aria-hidden="true" className="size-4 shrink-0" />
        <p className="flex-1">
          Confirm your email to enrol in courses. We sent a link to <strong>{user.email}</strong>.
        </p>
        <Button size="sm" variant="outline" className="bg-white" onClick={() => resend.mutate()} disabled={resend.isPending}>
          {resend.isPending ? 'Sending…' : 'Send a new link'}
        </Button>
      </div>
    </div>
  )
}
