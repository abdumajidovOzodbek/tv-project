import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

export const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Channel validation rules
export const validateChannel = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters')
    .trim(),
  
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
    .trim(),
  
  body('category')
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters')
    .trim(),
  
  body('streamUrl')
    .isURL()
    .withMessage('Stream URL must be a valid URL')
    .matches(/\.(m3u8|mpd)(\?.*)?$/i)
    .withMessage('Stream URL must be a .m3u8 or .mpd file'),
  
  body('thumbnail')
    .isURL()
    .withMessage('Thumbnail must be a valid URL')
    .matches(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)
    .withMessage('Thumbnail must be a valid image URL'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

// Chat validation rules
export const validateChatMessage = [
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters')
    .trim(),
  
  handleValidationErrors
];

// Parameter validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

// Query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];