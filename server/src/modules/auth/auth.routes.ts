import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authRateLimit, emailRateLimit } from '../../middlewares/rate-limit.js';
import { validate } from '../../middlewares/validate.js';
import { authController } from './auth.controller.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, tokenBodySchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, validate({ body: registerSchema }), authController.register);
authRouter.post('/login', authRateLimit, validate({ body: loginSchema }), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/verify-email', authRateLimit, validate({ body: tokenBodySchema }), authController.verifyEmail);
authRouter.post('/resend-verification', emailRateLimit, authenticate, authController.resendVerification);
authRouter.post('/forgot-password', emailRateLimit, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
authRouter.post('/reset-password', authRateLimit, validate({ body: resetPasswordSchema }), authController.resetPassword);
