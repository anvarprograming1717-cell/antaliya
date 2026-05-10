import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customersRouter from "./customers";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import likedRouter from "./liked";
import messagesRouter from "./messages";
import bannersRouter from "./banners";
import deliveryRouter from "./delivery";
import settingsRouter from "./settings";
import statsRouter from "./stats";
import notificationsRouter from "./notifications";
import couriersRouter from "./couriers";
import promoCodesRouter from "./promoCodes";
import chefRouter from "./chef";
import coinsRouter from "./coins";

const router: IRouter = Router();

router.use((req: Request, _res: Response, next: NextFunction) => {
  const customerId = req.headers["x-customer-id"];
  if (customerId) {
    (req as any).customerId = parseInt(Array.isArray(customerId) ? customerId[0] : customerId, 10);
  }
  const courierId = req.headers["x-courier-id"];
  if (courierId) {
    (req as any).courierId = parseInt(Array.isArray(courierId) ? courierId[0] : courierId, 10);
  }
  next();
});

router.use(healthRouter);
router.use(authRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(likedRouter);
router.use(messagesRouter);
router.use(bannersRouter);
router.use(deliveryRouter);
router.use(settingsRouter);
router.use(statsRouter);
router.use(notificationsRouter);
router.use(couriersRouter);
router.use(promoCodesRouter);
router.use(chefRouter);
router.use(coinsRouter);

export default router;
