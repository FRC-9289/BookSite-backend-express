import dotenv from "dotenv";

dotenv.config();

const key = process.env.TOKEN_SECRET || "your_secret_key";

function authMiddleware(req, res, next) {
  // Get the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided or invalid format" });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];

  if (token === key) {
    // Token is valid, allow access
    next();
  } else {
    // Token is invalid
    return res.status(401).json({ message: `Invalid token: ${token}` });
  }
}

export default authMiddleware;
