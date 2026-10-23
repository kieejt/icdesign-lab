import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'student'],
      default: 'admin',
    },

    // --- Profile ---------------------------------------------------------
    /** Shown in discussions instead of the e-mail address. */
    name: { type: String, trim: true, maxlength: 100, default: '' },
    /** Student number. Kept unique by the routes (a sparse unique index would
        need an index build on every deployment). */
    studentId: { type: String, trim: true, maxlength: 30 },

    // --- Access ----------------------------------------------------------
    /** A suspended account cannot sign in and its open sessions stop working. */
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    /** Set when an admin issued the password: the owner must replace it first. */
    mustChangePassword: { type: Boolean, default: false },
    /** Bumped to invalidate every token already issued to this account. */
    tokenVersion: { type: Number, default: 0 },

    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
  },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
