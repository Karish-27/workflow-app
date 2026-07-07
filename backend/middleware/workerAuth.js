const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');

const WORKER_AUDIENCE = 'workflow:worker';

function signWorkerToken(worker) {
  return jwt.sign(
    {
      id: worker._id,
      organization: worker.organization,
      aud: WORKER_AUDIENCE,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

async function protectWorker(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.aud !== WORKER_AUDIENCE) {
      return res.status(401).json({ success: false, message: 'Invalid worker token.' });
    }

    const worker = await Worker.findOne({
      _id: decoded.id,
      organization: decoded.organization,
      deletedAt: null,
      status: 'active',
      selfServiceEnabled: true,
    });
    if (!worker) {
      return res.status(401).json({ success: false, message: 'Worker not found or self-service disabled.' });
    }

    req.worker = worker;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = { protectWorker, signWorkerToken };
