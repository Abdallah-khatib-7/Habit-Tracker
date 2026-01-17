/**
 * Validation middleware specifically for habit operations
 */
class HabitValidationMiddleware {
  /**
   * Validate habit creation data
   */
  static validateCreateHabit(req, res, next) {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Habit name is required and must be a string.'
      });
    }

    // Trim and validate name length
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Habit name cannot be empty.'
      });
    }

    if (trimmedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Habit name cannot exceed 150 characters.'
      });
    }

    // Store trimmed name for consistency
    req.body.name = trimmedName;
    next();
  }

  /**
   * Validate habit update data
   */
  static validateUpdateHabit(req, res, next) {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Habit name is required and must be a string.'
      });
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Habit name cannot be empty.'
      });
    }

    if (trimmedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Habit name cannot exceed 150 characters.'
      });
    }

    // Validate habit ID parameter
    const habitId = parseInt(req.params.id);
    if (isNaN(habitId) || habitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid habit ID.'
      });
    }

    req.body.name = trimmedName;
    req.body.habitId = habitId;
    next();
  }

  /**
   * Validate habit log data
   */
  static validateLogHabit(req, res, next) {
    const { date, status } = req.body;
    const habitId = parseInt(req.params.id);

    // Validate habit ID
    if (isNaN(habitId) || habitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid habit ID.'
      });
    }

    // Validate date (default to today)
    let logDate = date;
    if (!logDate) {
      const today = new Date();
      logDate = today.toISOString().split('T')[0];
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(logDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }

    // Validate date is not in the future (business rule)
    const today = new Date().toISOString().split('T')[0];
    if (logDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot log habits for future dates.'
      });
    }

    // Validate status (0 = missed, 1 = completed, default to completed)
    let logStatus = status !== undefined ? parseInt(status) : 1;
    if (![0, 1].includes(logStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be 0 (missed) or 1 (completed).'
      });
    }

    req.body.date = logDate;
    req.body.status = logStatus;
    req.body.habitId = habitId;
    next();
  }

  /**
   * Validate habit ID parameter
   */
  static validateHabitId(req, res, next) {
    const habitId = parseInt(req.params.id);
    
    if (isNaN(habitId) || habitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid habit ID.'
      });
    }

    req.body.habitId = habitId;
    next();
  }

  /**
   * Validate query parameters for getting logs
   */
  static validateGetLogs(req, res, next) {
    const { startDate, endDate, limit } = req.query;
    const habitId = parseInt(req.params.id);

    if (isNaN(habitId) || habitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid habit ID.'
      });
    }

    const options = {};

    // Validate start date if provided
    if (startDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Use YYYY-MM-DD.'
        });
      }
      options.startDate = startDate;
    }

    // Validate end date if provided
    if (endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Use YYYY-MM-DD.'
        });
      }
      options.endDate = endDate;
    }

    // Validate date range order
    if (options.startDate && options.endDate && options.startDate > options.endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate.'
      });
    }

    // Validate limit if provided
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be a positive integer.'
        });
      }
      if (parsedLimit > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Limit cannot exceed 1000.'
        });
      }
      options.limit = parsedLimit;
    }

    req.body.habitId = habitId;
    req.body.options = options;
    next();
  }
}

export default HabitValidationMiddleware;