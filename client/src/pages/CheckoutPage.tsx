import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { CourseCover } from '@/components/CourseCover'
import { ErrorState } from '@/components/States'
import { TestPaymentDialog } from '@/components/TestPaymentDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourse } from '@/hooks/queries'
import { useStartCheckout, useVerifyPayment } from '@/hooks/useEnroll'
import { api, ApiError, errorMessage } from '@/lib/api'
import { formatPrice, plural } from '@/lib/format'
import { CheckoutDismissedError, openRazorpayCheckout } from '@/lib/razorpay'
import type { CheckoutResult, SignedCallback } from '@/lib/types'

type Order = Extract<CheckoutResult, { type: 'order' }>

/**
 * Enrolment flow for paid courses: create the order on the server, pay in Razorpay Checkout
 * (or the labelled test dialog), then let the server verify the signed callback.
 */
export function CheckoutPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: course, isPending, isError, error } = useCourse(slug, user?.id ?? 'anonymous')
  const startCheckout = useStartCheckout()
  const verifyPayment = useVerifyPayment()
  const [mockOrder, setMockOrder] = useState<Order | null>(null)
  const [isPayingMock, setIsPayingMock] = useState(false)
  const [enrolledCourseId, setEnrolledCourseId] = useState<string | null>(null)

  async function verify(callback: SignedCallback) {
    const result = await verifyPayment.mutateAsync(callback)
    setEnrolledCourseId(result.courseId)
    void queryClient.invalidateQueries({ queryKey: ['me'] })
    toast.success('Payment confirmed. You are enrolled.')
  }

  async function handlePay() {
    if (!course) return
    try {
      const result = await startCheckout.mutateAsync(course.id)
      if (result.type === 'enrolled') {
        setEnrolledCourseId(result.courseId)
        return
      }
      if (result.provider === 'mock') {
        setMockOrder(result)
        return
      }
      await verify(await openRazorpayCheckout(result))
    } catch (failure) {
      if (failure instanceof CheckoutDismissedError) toast.info('Payment cancelled. You have not been charged.')
      else if (failure instanceof ApiError && failure.code === 'ALREADY_ENROLLED') setEnrolledCourseId(course.id)
      else toast.error(errorMessage(failure))
    }
  }

  async function handleMockPay() {
    if (!mockOrder) return
    setIsPayingMock(true)
    try {
      const callback = await api.post<SignedCallback>(`/payments/mock/${mockOrder.orderId}/pay`)
      await verify(callback)
      setMockOrder(null)
    } catch (failure) {
      toast.error(errorMessage(failure))
    } finally {
      setIsPayingMock(false)
    }
  }

  if (isPending) return <div className="mx-auto max-w-3xl px-4 py-14"><Skeleton className="h-72 w-full rounded-2xl" /></div>
  if (isError) return <div className="mx-auto max-w-3xl px-4 py-14"><ErrorState error={error} /></div>
  if (course.price === 0) return <Navigate to={`/courses/${course.slug}`} replace />
  if (course.isEnrolled && !enrolledCourseId) return <Navigate to={`/learn/${course.id}`} replace />

  if (enrolledCourseId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-leaf" />
        <h1 className="mt-4 text-[2rem] font-bold">You are enrolled</h1>
        <p className="mt-2 text-graphite"><strong className="text-ink">{course.title}</strong> is now in your dashboard. A receipt is on its way to {user?.email}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-11 bg-marigold px-5 text-base font-semibold text-ink hover:bg-marigold/85"><Link to={`/learn/${enrolledCourseId}`}>Start the first lesson</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-11 bg-white px-5 text-base"><Link to="/dashboard">Go to my learning</Link></Button>
        </div>
      </div>
    )
  }

  const isBusy = startCheckout.isPending || verifyPayment.isPending
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link to={`/courses/${course.slug}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Back to the course</Link>
      <h1 className="mt-3 text-[2rem] font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[8rem_1fr] sm:p-6">
        <div className="w-28 sm:w-full"><CourseCover title={course.title} category={course.category} level={course.level} size="sm" /></div>
        <div>
          <h2 className="text-xl font-semibold">{course.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{course.instructor}, {plural(course.lessonCount, 'lesson')}</p>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Price</dt><dd>{formatPrice(course.price)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="font-heading">{formatPrice(course.price)}</dd></div>
          </dl>
          <Button onClick={handlePay} disabled={isBusy} className="mt-6 h-11 w-full bg-marigold text-base font-semibold text-ink hover:bg-marigold/85">
            {isBusy ? 'Preparing the payment…' : `Pay ${formatPrice(course.price)}`}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Payments are processed by Razorpay. Kalam never sees your card.
          </p>
        </div>
      </div>

      <TestPaymentDialog
        open={mockOrder !== null}
        amount={mockOrder?.amount ?? 0}
        courseTitle={course.title}
        isPaying={isPayingMock}
        onPay={handleMockPay}
        onCancel={() => {
          setMockOrder(null)
          toast.info('Payment cancelled. You have not been charged.')
        }}
      />
    </div>
  )
}
