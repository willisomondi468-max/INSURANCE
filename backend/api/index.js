const app = require('../src/index');

// Export as a function for Vercel serverless compatibility
module.exports = (req, res) => {
  app(req, res);
};
