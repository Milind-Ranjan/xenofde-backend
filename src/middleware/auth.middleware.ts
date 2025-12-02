import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  jwt.verify(token, jwtSecret, (err, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    next();
  });
};

export const requireTenant = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenantId) {
    res.status(403).json({ error: 'Tenant access required' });
    return;
  }
  next();
};

