import express, { Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ==============================
// Register a new tenant
// ==============================
router.post(
  '/register',
  [
    body('shopDomain').notEmpty().withMessage('Shop domain is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { shopDomain, accessToken, name, email, password } = req.body;

      // Check tenant exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { shopDomain },
      });

      if (existingTenant) {
        return res.status(400).json({ error: 'Tenant with this shop domain already exists' });
      }

      // Check user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          shopDomain,
          accessToken,
          name,
          email,
        },
      });

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          tenantId: tenant.id,
        },
      });

      // Generate token
      const jwtSecret = process.env.JWT_SECRET || 'secret-key';
      const token = jwt.sign(
        { userId: user.id, tenantId: tenant.id, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Tenant registered successfully',
        tenant: {
          id: tenant.id,
          shopDomain: tenant.shopDomain,
          name: tenant.name,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error: any) {
      console.error('Tenant registration error:', error);
      res.status(500).json({ error: 'Failed to register tenant', details: error.message });
    }
  }
);

// ==============================
// Login
// ==============================
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'secret-key';
      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email },
        jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              shopDomain: user.tenant.shopDomain,
              name: user.tenant.name,
            }
          : null,
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login', details: error.message });
    }
  }
);

// ==============================
// Get current tenant
// ==============================
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        shopDomain: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error: any) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to get tenant info', details: error.message });
  }
});

export default router;