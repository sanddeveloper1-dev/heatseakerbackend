/**
 * Jest setup file - runs before all tests
 * Mocks logStorageService and auth middleware to prevent database connections in tests
 */

// Mock logStorageService before any imports that might use it
// Path is relative to project root when used in setupFilesAfterEnv
jest.mock("../services/logStorageService", () => ({
  storeLog: jest.fn().mockResolvedValue(undefined),
  getLogsFromDatabase: jest.fn().mockResolvedValue([]),
  cleanupOldLogs: jest.fn().mockResolvedValue(0),
}));

// Mock strictJwtAuth middleware - returns a function that Express can use
jest.mock("../middleware/strictJwtAuth", () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: No valid JWT token provided",
      });
      return;
    }

    const token = authHeader.substring(7);
    // Simulate token validation - reject "invalid-token"
    if (token === "invalid-token") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or expired token",
        error: "Invalid token",
      });
      return;
    }

    // Valid token - set user
    req.user = {
      sub: "testadmin",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    next();
  };
  return {
    __esModule: true,
    default: mockMiddleware,
  };
});

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = "test";
