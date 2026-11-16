import { z } from 'zod';
import * as admin from '../modules/admin/admin.schemas.js';
import * as auth from '../modules/auth/auth.schemas.js';
import { catalogQuerySchema } from '../modules/courses/course.schemas.js';
import { verifyPaymentSchema } from '../modules/payments/payment.schemas.js';
import { paginationQuerySchema } from '../lib/pagination.js';

/**
 * OpenAPI 3.1 document. Request bodies and query parameters are generated from the same zod
 * schemas that validate requests, so the documentation cannot drift from the validation.
 */
type Access = 'public' | 'user' | 'admin' | 'cookie' | 'signature';

interface Operation {
  summary: string;
  tag: string;
  access: Access;
  body?: z.ZodType;
  query?: z.ZodObject;
  status?: number;
}

const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

function queryParameters(schema: z.ZodObject) {
  const json = jsonSchema(schema) as { properties?: Record<string, object>; required?: string[] };
  return Object.entries(json.properties ?? {}).map(([name, schemaObject]) => ({ name, in: 'query', required: false, schema: schemaObject }));
}

function pathParameters(path: string) {
  return [...path.matchAll(/\{(\w+)\}/g)].map((match) => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }));
}

function operation(path: string, op: Operation) {
  const security = op.access === 'user' || op.access === 'admin' ? [{ bearerAuth: [] }] : op.access === 'cookie' ? [{ refreshCookie: [] }] : [];
  return {
    tags: [op.tag],
    summary: op.summary,
    description: op.access === 'admin' ? 'Requires an access token of an admin.' : op.access === 'signature' ? 'Authenticated by the X-Razorpay-Signature header.' : undefined,
    security,
    parameters: [...pathParameters(path), ...(op.query ? queryParameters(op.query) : [])],
    requestBody: op.body ? { required: true, content: { 'application/json': { schema: jsonSchema(op.body) } } } : undefined,
    responses: {
      [String(op.status ?? 200)]: { description: 'Success' },
      '4XX': { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  };
}

const routes: Record<string, Partial<Record<'get' | 'post' | 'put' | 'patch' | 'delete', Operation>>> = {
  '/health': { get: { summary: 'Liveness and database status', tag: 'System', access: 'public' } },
  '/auth/register': { post: { summary: 'Create an account (generic 202 answer, verification email)', tag: 'Auth', access: 'public', body: auth.registerSchema, status: 202 } },
  '/auth/login': { post: { summary: 'Sign in: access token in the body, refresh token in a cookie', tag: 'Auth', access: 'public', body: auth.loginSchema } },
  '/auth/refresh': { post: { summary: 'Rotate the refresh token and get a new access token', tag: 'Auth', access: 'cookie' } },
  '/auth/logout': { post: { summary: 'Revoke the session', tag: 'Auth', access: 'cookie', status: 204 } },
  '/auth/verify-email': { post: { summary: 'Confirm an email address', tag: 'Auth', access: 'public', body: auth.tokenBodySchema } },
  '/auth/resend-verification': { post: { summary: 'Send a new confirmation link', tag: 'Auth', access: 'user', status: 202 } },
  '/auth/forgot-password': { post: { summary: 'Send a reset link (same answer for every email)', tag: 'Auth', access: 'public', body: auth.forgotPasswordSchema, status: 202 } },
  '/auth/reset-password': { post: { summary: 'Set a new password with a reset token', tag: 'Auth', access: 'public', body: auth.resetPasswordSchema } },
  '/me': { get: { summary: 'Current profile', tag: 'Me', access: 'user' } },
  '/me/enrollments': { get: { summary: 'My courses with progress', tag: 'Me', access: 'user', query: paginationQuerySchema } },
  '/courses': { get: { summary: 'Published courses: search, filters, pagination', tag: 'Courses', access: 'public', query: catalogQuerySchema } },
  '/courses/meta': { get: { summary: 'Categories and levels', tag: 'Courses', access: 'public' } },
  '/courses/{slug}': { get: { summary: 'Course detail (videos only for free previews)', tag: 'Courses', access: 'public' } },
  '/courses/{courseId}/checkout': { post: { summary: 'Enrol in a free course or create a payment order', tag: 'Enrolment', access: 'user' } },
  '/payments/verify': { post: { summary: 'Verify the checkout signature and enrol', tag: 'Enrolment', access: 'user', body: verifyPaymentSchema } },
  '/payments/mock/{orderId}/pay': { post: { summary: 'Mock provider only: simulate the checkout callback', tag: 'Enrolment', access: 'user' } },
  '/payments/webhooks/razorpay': { post: { summary: 'Razorpay webhook (payment.captured)', tag: 'Enrolment', access: 'signature' } },
  '/learn/{courseId}': { get: { summary: 'Full course with videos and my progress', tag: 'Learning', access: 'user' } },
  '/learn/{courseId}/lessons/{lessonId}/completion': {
    put: { summary: 'Mark a lesson complete', tag: 'Learning', access: 'user' },
    delete: { summary: 'Mark a lesson not complete', tag: 'Learning', access: 'user' },
  },
  '/admin/stats': { get: { summary: 'Overview numbers and recent payments', tag: 'Admin', access: 'admin' } },
  '/admin/courses': {
    get: { summary: 'All courses', tag: 'Admin', access: 'admin', query: admin.adminCoursesQuery },
    post: { summary: 'Create a course (draft)', tag: 'Admin', access: 'admin', body: admin.courseBodySchema, status: 201 },
  },
  '/admin/courses/{id}': {
    get: { summary: 'One course with its content', tag: 'Admin', access: 'admin' },
    patch: { summary: 'Update a course', tag: 'Admin', access: 'admin', body: admin.courseUpdateSchema },
    delete: { summary: 'Delete a course without enrolments', tag: 'Admin', access: 'admin', status: 204 },
  },
  '/admin/courses/{id}/publication': { patch: { summary: 'Publish or unpublish', tag: 'Admin', access: 'admin', body: admin.publicationSchema } },
  '/admin/courses/{id}/modules': { post: { summary: 'Add a module', tag: 'Admin', access: 'admin', body: admin.moduleBodySchema, status: 201 } },
  '/admin/courses/{id}/modules/order': { put: { summary: 'Reorder modules', tag: 'Admin', access: 'admin', body: admin.orderSchema } },
  '/admin/courses/{id}/modules/{moduleId}': {
    patch: { summary: 'Rename a module', tag: 'Admin', access: 'admin', body: admin.moduleBodySchema },
    delete: { summary: 'Delete a module', tag: 'Admin', access: 'admin' },
  },
  '/admin/courses/{id}/modules/{moduleId}/lessons': { post: { summary: 'Add a lesson', tag: 'Admin', access: 'admin', body: admin.lessonBodySchema, status: 201 } },
  '/admin/courses/{id}/modules/{moduleId}/lessons/order': { put: { summary: 'Reorder lessons', tag: 'Admin', access: 'admin', body: admin.orderSchema } },
  '/admin/courses/{id}/modules/{moduleId}/lessons/{lessonId}': {
    patch: { summary: 'Edit a lesson', tag: 'Admin', access: 'admin', body: admin.lessonUpdateSchema },
    delete: { summary: 'Delete a lesson', tag: 'Admin', access: 'admin' },
  },
  '/admin/users': { get: { summary: 'Users', tag: 'Admin', access: 'admin', query: admin.adminUsersQuery } },
  '/admin/users/{id}': { get: { summary: 'One user and their enrolments', tag: 'Admin', access: 'admin' } },
  '/admin/enrollments': { get: { summary: 'Enrolments', tag: 'Admin', access: 'admin', query: admin.adminEnrollmentsQuery } },
  '/admin/payments': { get: { summary: 'Payments', tag: 'Admin', access: 'admin', query: admin.adminPaymentsQuery } },
};

export function buildOpenApiDocument(serverUrl: string) {
  const paths = Object.fromEntries(
    Object.entries(routes).map(([path, methods]) => [path, Object.fromEntries(Object.entries(methods).map(([method, op]) => [method, operation(path, op!)]))]),
  );
  return {
    openapi: '3.1.0',
    info: { title: 'Kalam API', version: '1.0.0', description: 'Online course platform API. Errors use `{ error: { code, message, details? } }`. Lists return `{ items, page, limit, total, totalPages }`.' },
    servers: [{ url: serverUrl }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        refreshCookie: { type: 'apiKey', in: 'cookie', name: 'kalam_rt' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} }, required: ['code', 'message'] } },
        },
      },
    },
  };
}
