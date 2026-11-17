import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, errorMessage, toQuery } from '@/lib/api'
import type { Category, CourseFull, Level, Paginated, PaymentStatus, Role } from '@/lib/types'

export interface AdminStats {
  users: number
  enrollments: number
  revenue: { amount: number; currency: 'INR' }
  publishedCourses: number
  recentPayments: { id: string; amount: number; paidAt: string | null; user: { name: string; email: string } | null; course: { title: string } | null }[]
}

export type AdminCourseRow = Omit<CourseFull, 'modules'> & { enrollmentCount: number }

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: Role
  isEmailVerified: boolean
  createdAt?: string
  enrollmentCount: number
}

export interface AdminUserDetail {
  user: Omit<AdminUserRow, 'enrollmentCount'>
  enrollments: { id: string; enrolledAt: string; course: { id: string; title: string; slug: string } | null; progress: number }[]
}

export interface AdminEnrollmentRow {
  id: string
  enrolledAt: string
  user: { id: string; name: string; email: string } | null
  course: { id: string; title: string } | null
  progress: number
  payment: { amount: number; status: PaymentStatus; provider: string } | null
}

export interface AdminPaymentRow {
  id: string
  orderId: string
  paymentId: string | null
  provider: 'razorpay' | 'mock'
  amount: number
  currency: 'INR'
  status: PaymentStatus
  createdAt: string
  paidAt: string | null
  user: { id: string; name: string; email: string } | null
  course: { id: string; title: string } | null
}

export interface CourseInput {
  title: string
  summary: string
  description: string
  category: Category
  level: Level
  price: number
  instructor: string
}

export interface LessonInput {
  title: string
  videoUrl: string
  durationMinutes: number
  isFreePreview: boolean
}

type Params = Record<string, string | number | undefined>

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  courses: (params: Params) => ['admin', 'courses', params] as const,
  course: (id: string) => ['admin', 'course', id] as const,
  users: (params: Params) => ['admin', 'users', params] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  enrollments: (params: Params) => ['admin', 'enrollments', params] as const,
  payments: (params: Params) => ['admin', 'payments', params] as const,
}

export const useAdminStats = () => useQuery({ queryKey: adminKeys.stats, queryFn: () => api.get<AdminStats>('/admin/stats') })

export const useAdminCourses = (params: Params) =>
  useQuery({ queryKey: adminKeys.courses(params), queryFn: () => api.get<Paginated<AdminCourseRow>>(`/admin/courses${toQuery(params)}`), placeholderData: keepPreviousData })

export const useAdminCourse = (id: string) =>
  useQuery({ queryKey: adminKeys.course(id), queryFn: () => api.get<{ course: CourseFull }>(`/admin/courses/${id}`).then((data) => data.course) })

export const useAdminUsers = (params: Params) =>
  useQuery({ queryKey: adminKeys.users(params), queryFn: () => api.get<Paginated<AdminUserRow>>(`/admin/users${toQuery(params)}`), placeholderData: keepPreviousData })

export const useAdminUser = (id: string | null) =>
  useQuery({ queryKey: adminKeys.user(id ?? ''), queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`), enabled: Boolean(id) })

export const useAdminEnrollments = (params: Params) =>
  useQuery({ queryKey: adminKeys.enrollments(params), queryFn: () => api.get<Paginated<AdminEnrollmentRow>>(`/admin/enrollments${toQuery(params)}`), placeholderData: keepPreviousData })

export const useAdminPayments = (params: Params) =>
  useQuery({ queryKey: adminKeys.payments(params), queryFn: () => api.get<Paginated<AdminPaymentRow>>(`/admin/payments${toQuery(params)}`), placeholderData: keepPreviousData })

/**
 * Content mutations all return the updated course: the editor cache is replaced with it and the
 * lists are refreshed. `successMessage` uses the same verb as the button that triggered it.
 */
export function useCourseMutation<TVariables>(courseId: string, request: (variables: TVariables) => Promise<{ course: CourseFull }>, successMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: ({ course }) => {
      queryClient.setQueryData(adminKeys.course(courseId), course)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(successMessage)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
