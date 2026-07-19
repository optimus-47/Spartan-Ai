const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");

const SALT_ROUNDS = 10;

async function signup(email, password) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const err = new Error("An account with this email already exists");
    err.statusCode = 409;
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return { id: user.id, email: user.email };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, user: { id: user.id, email: user.email } };
}

module.exports = { signup, login };