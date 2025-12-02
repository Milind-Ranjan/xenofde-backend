import express from 'express';
import prisma from '../config/database';
import { authenticateToken, requireTenant, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication and tenant
router.use(authenticateToken);
router.use(requireTenant);

// Get dashboard overview metrics
router.get('/overview', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const [totalCustomers, totalOrders, totalRevenue, totalProducts] = await Promise.all([
      prisma.customer.count({ where: { tenantId: req.tenantId } }),
      prisma.order.count({ where: { tenantId: req.tenantId } }),
      prisma.order.aggregate({
        where: { tenantId: req.tenantId },
        _sum: { totalPrice: true },
      }),
      prisma.product.count({ where: { tenantId: req.tenantId } }),
    ]);

    // Calculate additional metrics
    const avgOrderValue = totalOrders > 0 
      ? Number(totalRevenue._sum.totalPrice || 0) / totalOrders 
      : 0;

    const recentOrders = await prisma.order.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { shopifyCreatedAt: 'desc' },
      take: 30,
      select: { totalPrice: true, shopifyCreatedAt: true },
    });

    // Calculate growth metrics (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentRevenue, previousRevenue] = await Promise.all([
      prisma.order.aggregate({
        where: {
          tenantId: req.tenantId,
          shopifyCreatedAt: { gte: sevenDaysAgo },
        },
        _sum: { totalPrice: true },
      }),
      prisma.order.aggregate({
        where: {
          tenantId: req.tenantId,
          shopifyCreatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const revenueGrowth = previousRevenue._sum.totalPrice && Number(previousRevenue._sum.totalPrice) > 0
      ? ((Number(recentRevenue._sum.totalPrice || 0) - Number(previousRevenue._sum.totalPrice)) / Number(previousRevenue._sum.totalPrice)) * 100
      : 0;

    res.json({
      totalCustomers,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      totalProducts,
      avgOrderValue,
      revenueGrowth: Number(revenueGrowth.toFixed(2)),
    });
  } catch (error: any) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to get overview', details: error.message });
  }
});

// Get orders by date range
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const { startDate, endDate, limit = 100, offset = 0 } = req.query;

    const where: any = { tenantId: req.tenantId };

    if (startDate || endDate) {
      where.shopifyCreatedAt = {};
      if (startDate) {
        where.shopifyCreatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.shopifyCreatedAt.lte = new Date(endDate as string);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { shopifyCreatedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Orders error:', error);
    res.status(500).json({ error: 'Failed to get orders', details: error.message });
  }
});

// Get top customers by spend
router.get('/customers/top', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const limit = parseInt((req.query.limit as string) || '5');

    const topCustomers = await prisma.customer.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        totalSpent: true,
        ordersCount: true,
        shopifyCreatedAt: true,
      },
    });

    res.json(topCustomers);
  } catch (error: any) {
    console.error('Top customers error:', error);
    res.status(500).json({ error: 'Failed to get top customers', details: error.message });
  }
});

// Get revenue trends (daily)
router.get('/revenue/trends', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const { startDate, endDate, groupBy = 'day' } = req.query;

    const where: any = { tenantId: req.tenantId };

    if (startDate || endDate) {
      where.shopifyCreatedAt = {};
      if (startDate) {
        where.shopifyCreatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.shopifyCreatedAt.lte = new Date(endDate as string);
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        totalPrice: true,
        shopifyCreatedAt: true,
      },
      orderBy: { shopifyCreatedAt: 'asc' },
    });

    // Group by day, week, or month
    const grouped: Record<string, number> = {};

    orders.forEach((order) => {
      if (!order.shopifyCreatedAt) return;

      const date = new Date(order.shopifyCreatedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      grouped[key] = (grouped[key] || 0) + Number(order.totalPrice);
    });

    const trends = Object.entries(grouped)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(trends);
  } catch (error: any) {
    console.error('Revenue trends error:', error);
    res.status(500).json({ error: 'Failed to get revenue trends', details: error.message });
  }
});

// Get order status distribution
router.get('/orders/status', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const statusCounts = await prisma.order.groupBy({
      by: ['financialStatus'],
      where: { tenantId: req.tenantId },
      _count: { id: true },
    });

    res.json(statusCounts.map((s) => ({ status: s.financialStatus || 'unknown', count: s._count.id })));
  } catch (error: any) {
    console.error('Order status error:', error);
    res.status(500).json({ error: 'Failed to get order status', details: error.message });
  }
});

// Get product performance
router.get('/products/top', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const limit = parseInt((req.query.limit as string) || '10');

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { tenantId: req.tenantId },
        productId: { not: null },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        price: true,
        inventoryQuantity: true,
      },
    });

    const result = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      // Calculate total revenue: sum of (quantity * price) for each order item
      const totalRevenue = Number(item._sum.price || 0);
      return {
        product: product || { id: item.productId, title: 'Unknown Product' },
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: totalRevenue,
        orderCount: item._count.id,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue descending

    res.json(result);
  } catch (error: any) {
    console.error('Top products error:', error);
    res.status(500).json({ error: 'Failed to get top products', details: error.message });
  }
});

// Get customer acquisition trends
router.get('/customers/trends', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const { startDate, endDate, groupBy = 'day' } = req.query;

    const where: any = { tenantId: req.tenantId };

    if (startDate || endDate) {
      where.shopifyCreatedAt = {};
      if (startDate) {
        where.shopifyCreatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.shopifyCreatedAt.lte = new Date(endDate as string);
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        shopifyCreatedAt: true,
      },
      orderBy: { shopifyCreatedAt: 'asc' },
    });

    const grouped: Record<string, number> = {};

    customers.forEach((customer) => {
      if (!customer.shopifyCreatedAt) return;

      const date = new Date(customer.shopifyCreatedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    const trends = Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(trends);
  } catch (error: any) {
    console.error('Customer trends error:', error);
    res.status(500).json({ error: 'Failed to get customer trends', details: error.message });
  }
});

// Get average order value trends
router.get('/aov/trends', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const { startDate, endDate, groupBy = 'day' } = req.query;

    const where: any = { tenantId: req.tenantId };

    if (startDate || endDate) {
      where.shopifyCreatedAt = {};
      if (startDate) {
        where.shopifyCreatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.shopifyCreatedAt.lte = new Date(endDate as string);
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        totalPrice: true,
        shopifyCreatedAt: true,
      },
      orderBy: { shopifyCreatedAt: 'asc' },
    });

    const grouped: Record<string, { total: number; count: number }> = {};

    orders.forEach((order) => {
      if (!order.shopifyCreatedAt) return;

      const date = new Date(order.shopifyCreatedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0 };
      }
      grouped[key].total += Number(order.totalPrice);
      grouped[key].count += 1;
    });

    const trends = Object.entries(grouped)
      .map(([date, data]) => ({ 
        date, 
        aov: data.count > 0 ? data.total / data.count : 0 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(trends);
  } catch (error: any) {
    console.error('AOV trends error:', error);
    res.status(500).json({ error: 'Failed to get AOV trends', details: error.message });
  }
});

// Get conversion funnel metrics
router.get('/funnel', async (req: AuthRequest, res) => {
  try {
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const totalCustomers = await prisma.customer.count({
      where: { tenantId: req.tenantId },
    });

    const totalOrders = await prisma.order.count({
      where: { tenantId: req.tenantId },
    });

    const totalRevenue = await prisma.order.aggregate({
      where: { tenantId: req.tenantId },
      _sum: { totalPrice: true },
    });

    const customersWithOrders = await prisma.customer.count({
      where: {
        tenantId: req.tenantId,
        ordersCount: { gt: 0 },
      },
    });

    const conversionRate = totalCustomers > 0 
      ? (customersWithOrders / totalCustomers) * 100 
      : 0;

    const repeatPurchaseRate = customersWithOrders > 0
      ? await prisma.customer.count({
          where: {
            tenantId: req.tenantId,
            ordersCount: { gt: 1 },
          },
        }) / customersWithOrders * 100
      : 0;

    res.json({
      totalCustomers,
      customersWithOrders,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      conversionRate: Number(conversionRate.toFixed(2)),
      repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(2)),
    });
  } catch (error: any) {
    console.error('Funnel error:', error);
    res.status(500).json({ error: 'Failed to get funnel metrics', details: error.message });
  }
});

export default router;
