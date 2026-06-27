/**
 * @module validateRequest
 * @description Reusable request validation middleware factory.
 * Returns middleware that checks for required fields in req.body,
 * req.params, req.query, or req.file.
 */

/**
 * Creates validation middleware for incoming requests.
 *
 * @param {Object} rules
 * @param {string[]} [rules.body]   — Required keys in req.body
 * @param {string[]} [rules.params] — Required keys in req.params
 * @param {string[]} [rules.query]  — Required keys in req.query
 * @param {boolean}  [rules.file]   — Whether req.file is required (multer)
 * @returns {import('express').RequestHandler}
 */
function validateRequest(rules = {}) {
  return (req, res, next) => {
    const errors = [];

    if (rules.body) {
      for (const key of rules.body) {
        if (!req.body?.[key]) {
          errors.push(`Missing required body field: "${key}"`);
        }
      }
    }

    if (rules.params) {
      for (const key of rules.params) {
        if (!req.params?.[key]) {
          errors.push(`Missing required URL parameter: "${key}"`);
        }
      }
    }

    if (rules.query) {
      for (const key of rules.query) {
        if (!req.query?.[key]) {
          errors.push(`Missing required query parameter: "${key}"`);
        }
      }
    }

    if (rules.file && !req.file) {
      errors.push('Missing required audio file');
    }

    if (errors.length > 0) {
      const err = new Error(errors.join('; '));
      err.statusCode = 400;
      return next(err);
    }

    next();
  };
}

export default validateRequest;
