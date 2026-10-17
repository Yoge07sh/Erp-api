const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    // Split the string and take the second part (the actual token)
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const secret_key = process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret_key);

    req.user = decoded;

    next();
  } catch (error) {
    console.log(error);

    return res.status(401).send({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
