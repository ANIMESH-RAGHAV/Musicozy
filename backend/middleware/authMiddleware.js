const jwt = require('jsonwebtoken');

// JWT Authentication Middleware
function authMiddleware(req, res, next) {
    try {
        // Check JWT secret configuration
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server authentication configuration error'
            });
        }

        // Read Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication token is required'
            });
        }

        // Extract token
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Invalid authentication token'
            });
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach authenticated user's ID to request
        req.userId = decoded.userId;

        // Continue to next middleware/controller
        next();

    } catch (error) {
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError'
        ) {
            return res.status(401).json({
                message: 'Invalid or expired authentication token'
            });
        }

        console.error('Authentication error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

module.exports = authMiddleware;