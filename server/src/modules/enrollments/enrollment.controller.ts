import type { Request, Response } from 'express';
import { input } from '../../middlewares/validate.js';
import type { PaginationQuery } from '../../lib/pagination.js';
import { enrollmentService } from './enrollment.service.js';

export const enrollmentController = {
  async checkout(req: Request, res: Response) {
    const { courseId } = input.params<{ courseId: string }>(req);
    const result = await enrollmentService.checkout(req.auth!.userId, courseId);
    res.status(result.type === 'enrolled' ? 201 : 200).json(result);
  },

  async verify(req: Request, res: Response) {
    const body = input.body<{ orderId: string; paymentId: string; signature: string }>(req);
    res.json(await enrollmentService.verifyPayment(req.auth!.userId, body));
  },

  async simulateMock(req: Request, res: Response) {
    const { orderId } = input.params<{ orderId: string }>(req);
    res.json(await enrollmentService.simulateMockPayment(req.auth!.userId, orderId));
  },

  async webhook(req: Request, res: Response) {
    const signature = req.header('x-razorpay-signature') ?? undefined;
    res.json(await enrollmentService.handleRazorpayWebhook(req.body as Buffer, signature));
  },

  async mine(req: Request, res: Response) {
    res.json(await enrollmentService.listMine(req.auth!.userId, input.query<PaginationQuery>(req)));
  },
};
