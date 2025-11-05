const { v4: uuidv4 } = require('uuid');

const generateId = () => uuidv4();
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

module.exports = { generateId, generateOTP };