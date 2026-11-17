import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, toQuery } from '@/lib/api'
import type { CourseCard, CourseDetail, CourseFull, MyEnrollment, Paginated, Progress } from '@/lib/types'

export interface CatalogFilters {
  search?: string
  category?: string
  level?: string
  price?: string
  sort?: string
  page?: number
}

export const queryKeys = {
  catalog: (filters: CatalogFilters) => ['catalog', filters] as const,
  course: (slug: string) => ['course', slug] as const,
  myEnrollments: (page: number) => ['me', 'enrollments', page] as const,
  learn: (courseId: string) => ['learn', courseId] as const,
}

export function useCatalog(filters: CatalogFilters, limit = 9) {
  return useQuery({
    queryKey: [...queryKeys.catalog(filters), limit],
    queryFn: ({ signal }) => api.get<Paginated<CourseCard>>(`/courses${toQuery({ ...filters, limit })}`, signal),
    placeholderData: keepPreviousData,
  })
}

export function useCourse(slug: string, viewerKey: string) {
  return useQuery({
    // The viewer is part of the key: `isEnrolled` and video URLs depend on who is asking.
    queryKey: [...queryKeys.course(slug), viewerKey],
    queryFn: ({ signal }) => api.get<{ course: CourseDetail }>(`/courses/${slug}`, signal).then((data) => data.course),
  })
}

export function useMyEnrollments(page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myEnrollments(page),
    queryFn: ({ signal }) => api.get<Paginated<MyEnrollment>>(`/me/enrollments${toQuery({ page, limit: 12 })}`, signal),
    enabled,
  })
}

export interface LearnData {
  course: CourseFull
  progress: Progress
  lastLessonId: string | null
  isPreview: boolean
}

export function useLearn(courseId: string) {
  return useQuery({
    queryKey: queryKeys.learn(courseId),
    queryFn: ({ signal }) => api.get<LearnData>(`/learn/${courseId}`, signal),
  })
}
