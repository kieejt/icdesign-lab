import AuditLog from '../models/AuditLog.js'

/**
 * Helper function to log an admin action into the database.
 * @param {Object} req Express request object containing user authentication
 * @param {string} action Category of action (e.g. "CREATE_LECTURE")
 * @param {string} details Readable description of the action
 */
export const logAdminAction = async (req, action, details) => {
  try {
    const admin = req.user?.id
    const adminEmail = req.user?.email || 'unknown@lab.com'
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
    const userAgent = req.headers['user-agent'] || 'unknown'

    await AuditLog.create({
      admin,
      adminEmail,
      action,
      details,
      ip,
      userAgent,
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}
