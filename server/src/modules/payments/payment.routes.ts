import express, { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { enrollmentController } from '../enrollments/enrollment.controller.js';
import { orderParamsSchema, verifyPaymentSchema } from './payment.schemas.js';

/** JSON routes, mounted after the JSON body parser. */
export const paymentRouter = Router();
paymentRouter.post('/verify', authenticate, validate({ body: verifyPaymentSchema }), enrollmentController.verify);
paymentRouter.post('/mock/:orderId/pay', authenticate, validate({ params: orderParamsSchema }), enrollmentController.simulateMock);

/** The webhook signature is computed on the exact bytes sent, so this route reads the raw body. */
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post('/razorpay', express.raw({ type: 'application/json', limit: '100kb' }), enrollmentController.webhook);
