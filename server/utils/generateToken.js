import jwt from 'jsonwebtoken'

import { SESSION_TTL_JWT } from '../constants/auth.js'

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    // Matched to the cookie's lifetime — see constants/auth.js.
    { expiresIn: SESSION_TTL_JWT },
  )
}

export default generateToken
