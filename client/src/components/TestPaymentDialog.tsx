import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatPaise } from '@/lib/format'

interface TestPaymentDialogProps {
  open: boolean
  amount: number
  courseTitle: string
  isPaying: boolean
  onPay: () => void
  onCancel: () => void
}

/**
 * Stand-in for the Razorpay popup when the server runs the mock provider (no Razorpay keys).
 * Clearly labelled as a test: no card details are asked and no money moves.
 */
export function TestPaymentDialog({ open, amount, courseTitle, isPaying, onPay, onCancel }: TestPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPaying && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-marigold-soft px-2.5 py-1 text-xs font-semibold text-ink">
            <FlaskConical aria-hidden="true" className="size-3.5" /> Test payment
          </p>
          <DialogTitle className="pt-2 text-xl">Simulate the payment</DialogTitle>
          <DialogDescription>
            This server has no Razorpay keys, so it uses a local test provider. No card is charged and no money moves. The server still verifies a signed payment before it enrols you.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Course</dt>
          <dd className="font-medium">{courseTitle}</dd>
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-heading font-bold">{formatPaise(amount)}</dd>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPaying}>Cancel</Button>
          <Button onClick={onPay} disabled={isPaying}>{isPaying ? 'Paying…' : `Pay ${formatPaise(amount)} (test)`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
