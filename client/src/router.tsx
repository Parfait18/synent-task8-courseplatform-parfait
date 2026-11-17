import { createBrowserRouter, Outlet } from 'react-router'
import { AdminRoute, GuestOnly, RequireAuth } from '@/auth/guards'
import { LearnerLayout } from '@/layouts/LearnerLayout'
import { CatalogPage } from '@/pages/CatalogPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HomePage } from '@/pages/HomePage'
import { LearnPage } from '@/pages/LearnPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'

export const router = createBrowserRouter([
  {
    element: <LearnerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/courses', element: <CatalogPage /> },
      { path: '/courses/:slug', element: <CourseDetailPage /> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/dashboard', element: <RequireAuth><DashboardPage /></RequireAuth> },
      { path: '/checkout/:slug', element: <RequireAuth><CheckoutPage /></RequireAuth> },
      { path: '/learn/:courseId', element: <RequireAuth><LearnPage /></RequireAuth> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute><Outlet /></AdminRoute>,
    // The admin panel is loaded on demand, so learners never download it.
    children: [
      {
        lazy: async () => ({ Component: (await import('@/layouts/AdminLayout')).AdminLayout }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('@/pages/admin/AdminOverviewPage')).AdminOverviewPage }) },
          { path: 'courses', lazy: async () => ({ Component: (await import('@/pages/admin/AdminCoursesPage')).AdminCoursesPage }) },
          { path: 'courses/:id', lazy: async () => ({ Component: (await import('@/pages/admin/AdminCourseEditorPage')).AdminCourseEditorPage }) },
          { path: 'users', lazy: async () => ({ Component: (await import('@/pages/admin/AdminUsersPage')).AdminUsersPage }) },
          { path: 'enrollments', lazy: async () => ({ Component: (await import('@/pages/admin/AdminEnrollmentsPage')).AdminEnrollmentsPage }) },
          { path: 'payments', lazy: async () => ({ Component: (await import('@/pages/admin/AdminPaymentsPage')).AdminPaymentsPage }) },
        ],
      },
    ],
  },
])
