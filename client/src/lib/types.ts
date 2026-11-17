/** Shapes returned by the Kalam API (see server presenters). */
export type Role = 'user' | 'admin'
export type Category = 'development' | 'design' | 'data' | 'business' | 'marketing' | 'photography'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type PaymentStatus = 'created' | 'paid' | 'failed'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isEmailVerified: boolean
  createdAt?: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface CourseCard {
  id: string
  slug: string
  title: string
  summary: string
  category: Category
  level: Level
  /** Whole rupees, 0 = free. */
  price: number
  instructor: string
  moduleCount: number
  lessonCount: number
  totalMinutes: number
}

export interface Lesson {
  id: string
  title: string
  durationMinutes: number
  isFreePreview: boolean
  videoUrl: string | null
}

/** Lesson as seen by enrolled learners and admins: the video URL is always present. */
export interface FullLesson extends Omit<Lesson, 'videoUrl'> {
  videoUrl: string
}

export interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

export interface CourseDetail extends CourseCard {
  description: string
  isEnrolled: boolean
  modules: Module[]
}

export interface CourseFull extends CourseCard {
  description: string
  isPublished: boolean
  createdAt?: string
  updatedAt?: string
  modules: { id: string; title: string; lessons: FullLesson[] }[]
}

export interface Progress {
  completedLessonIds: string[]
  completedCount: number
  totalCount: number
  percent: number
  nextLessonId: string | null
}

export interface MyEnrollment {
  id: string
  enrolledAt: string
  course: CourseCard
  progress: Progress
  lastLessonId: string | null
}

export type CheckoutResult =
  | { type: 'enrolled'; courseId: string }
  | {
      type: 'order'
      provider: 'razorpay' | 'mock'
      orderId: string
      /** Paise. */
      amount: number
      currency: 'INR'
      keyId: string | null
      course: { id: string; title: string }
      prefill: { name: string; email: string }
    }

export interface SignedCallback {
  orderId: string
  paymentId: string
  signature: string
}
