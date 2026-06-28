import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { tilesRouter } from "./tiles";
import { equipmentRouter } from "./equipment";
import { dashboardRouter } from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tiles", tilesRouter);
router.use("/equipment", equipmentRouter);
router.use("/dashboard", dashboardRouter);

export default router;
