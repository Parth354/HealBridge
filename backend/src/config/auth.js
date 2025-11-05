const jwt = require('jsonwebtoken');
const config = require('./env');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };