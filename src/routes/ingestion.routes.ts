import express from 'express';
import prisma from '../config/database';
import { IngestionService } from '../services/ingestion.service';
import { authenticateToken, requireTenant, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication and tenant
router.use(authenticateToken);
router.use(requireTenant);

// Trigger full data ingestion
router.post('/sync/all', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ingestionService = new IngestionService(
      tenant.id,
      tenant.shopDomain,
      tenant.accessToken
    );

    const result = await ingestionService.ingestAll();

    res.json({
      message: 'Data ingestion completed',
      result,
    });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest data', details: error.message });
  }
});

// Sync customers only
router.post('/sync/customers', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ingestionService = new IngestionService(
      tenant.id,
      tenant.shopDomain,
      tenant.accessToken
    );

    const result = await ingestionService.ingestCustomers();

    res.json({
      message: 'Customers ingestion completed',
      result,
    });
  } catch (error: any) {
    console.error('Customers ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest customers', details: error.message });
  }
});

// Sync products only
router.post('/sync/products', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ingestionService = new IngestionService(
      tenant.id,
      tenant.shopDomain,
      tenant.accessToken
    );

    const result = await ingestionService.ingestProducts();

    res.json({
      message: 'Products ingestion completed',
      result,
    });
  } catch (error: any) {
    console.error('Products ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest products', details: error.message });
  }
});

// Sync orders only
router.post('/sync/orders', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ingestionService = new IngestionService(
      tenant.id,
      tenant.shopDomain,
      tenant.accessToken
    );

    const result = await ingestionService.ingestOrders();

    res.json({
      message: 'Orders ingestion completed',
      result,
    });
  } catch (error: any) {
    console.error('Orders ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest orders', details: error.message });
  }
});

// Record a custom event (webhook endpoint)
router.post('/events', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const { eventType, customerId, orderId, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const ingestionService = new IngestionService(
      req.tenantId,
      '', // Not needed for events
      '' // Not needed for events
    );

    await ingestionService.recordEvent(eventType, customerId, orderId, metadata);

    res.json({
      message: 'Event recorded successfully',
    });
  } catch (error: any) {
    console.error('Event recording error:', error);
    res.status(500).json({ error: 'Failed to record event', details: error.message });
  }
});

export default router;

