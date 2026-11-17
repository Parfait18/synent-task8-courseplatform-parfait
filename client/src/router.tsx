import { createBrowserRouter } from 'react-router'
import { AdminRoute, GuestOnly, RequireAuth } from '@/auth/guards'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LearnerLayout } from '@/layouts/LearnerLayout'
import { CatalogPage } from '@/pages/CatalogPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HomePage } from '@/pages/HomePage'
import { LearnPage } from '@/pages/LearnPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AdminCourseEditorPage } from '@/pages/admin/AdminCourseEditorPage'
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage'
import { AdminEnrollmentsPage } from '@/pages/admin/AdminEnrollmentsPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
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
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'courses', element: <AdminCoursesPage /> },
      { path: 'courses/:id', element: <AdminCourseEditorPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'enrollments', element: <AdminEnrollmentsPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
    ],
  },
])
