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

// Mock apiKeyAuth middleware - returns a function that Express can use
jest.mock("../middleware/apiKeyAuth", () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const apiKey = req.header("x-api-key");
    if (!apiKey || apiKey !== "test-api-key") {
      res.status(403).json({
        error: apiKey ? "Forbidden: Invalid API key" : "Forbidden: No API key provided",
      });
      return;
    }
    next();
  };
  return {
    __esModule: true,
    default: mockMiddleware,
  };
});

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = "test";
