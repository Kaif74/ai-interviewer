/**
 * @module asyncHandler
 * @description Wraps async Express route handlers so rejected promises are
 * automatically forwarded to the global error-handling middleware.
 *
 * Usage:
 *   router.post('/path', asyncHandler(myController.method));
 *
 * @param {Function} fn — async (req, res, next) => {}
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
