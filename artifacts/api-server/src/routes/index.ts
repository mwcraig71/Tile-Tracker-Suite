import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { tilesRouter } from "./tiles";
import { equipmentRouter } from "./equipment";
import { dashboardRouter } from "./dashboard";
import { scanRouter, equipmentScansRouter } from "./scan";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tiles", tilesRouter);
router.use("/equipment", equipmentRouter);
router.use("/equipment/:id/scans", equipmentScansRouter);
router.use("/dashboard", dashboardRouter);
router.use("/scan", scanRouter);

export default router;
