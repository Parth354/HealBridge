import jwt from 'jsonwebtoken';
import config from './env.js';

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};