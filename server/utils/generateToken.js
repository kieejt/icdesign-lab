import jwt from 'jsonwebtoken'

import { SESSION_TTL_JWT } from '../constants/auth.js'

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      // Compared with the account's current value on every request, so bumping
      // it signs the account out everywhere (see utils/session.js).
      tv: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    // Matched to the cookie's lifetime — see constants/auth.js.
    { expiresIn: SESSION_TTL_JWT },
  )
}

export default generateToken
