import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { tilesRouter } from "./tiles";
import { equipmentRouter } from "./equipment";
import { dashboardRouter } from "./dashboard";
import { scanRouter, equipmentScansRouter } from "./scan";
import { equipmentLogsRouter } from "./logs";
import { equipmentComponentsRouter } from "./components";
import { qrLookupRouter } from "./qr-lookup";
import { settingsRouter } from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tiles", tilesRouter);
router.use("/equipment", equipmentRouter);
router.use("/equipment/:id/scans", equipmentScansRouter);
router.use("/equipment/:id/logs", equipmentLogsRouter);
router.use("/equipment/:id/components", equipmentComponentsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/scan", scanRouter);
router.use("/qr/lookup", qrLookupRouter);
router.use("/settings", settingsRouter);

export default router;
