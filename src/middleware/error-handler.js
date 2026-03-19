/**
 * Error Handling Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry - record already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW') {
    statusCode = 400;
    message = 'Referenced record not found';
  }

  // Check if request expects JSON (API) or HTML (web)
  const acceptHeader = req.headers.accept || '';
  const isApiRequest = req.xhr || 
                       req.path.startsWith('/api/') || 
                       acceptHeader.includes('application/json');

  if (isApiRequest) {
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  } else {
    res.status(statusCode).render('error', {
      title: 'Error',
      message,
      statusCode,
      user: req.user
    });
  }
};

// 404 handler
const notFound = (req, res, next) => {
  console.log('[404] Not Found:', req.method, req.originalUrl);
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
};

module.exports = {
  errorHandler,
  notFound
};
