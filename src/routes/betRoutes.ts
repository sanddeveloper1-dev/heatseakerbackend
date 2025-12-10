/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 Paul Stortini
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "AS IS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * Bet routes for betting operations and XpressBet integration
 */

import { Router } from "express";
import flexibleAuth from "../middleware/flexibleAuth"; // Import flexible auth middleware (JWT OR API key)
import { handleBetRequest } from "../controllers/betController";

const router = Router();

router.post("/submit-bets", flexibleAuth, handleBetRequest);

export default router;