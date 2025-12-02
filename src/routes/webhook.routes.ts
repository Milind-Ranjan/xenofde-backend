import express from 'express';
import prisma from '../config/database';
import { IngestionService } from '../services/ingestion.service';
import crypto from 'crypto';

const router = express.Router();

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const hash = hmac.update(body, 'utf8').digest('base64');
  return hash === signature;
}

// Webhook endpoint for Shopify events
router.post('/shopify', express.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
  try {
    const signature = req.headers['x-shopify-hmac-sha256'] as string;
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;
    const topic = req.headers['x-shopify-topic'] as string;

    if (!signature || !shopDomain || !topic) {
      return res.status(400).json({ error: 'Missing required headers' });
    }

    // Find tenant by shop domain
    const tenant = await prisma.tenant.findUnique({
      where: { shopDomain },
    });

    if (!tenant) {
      console.log(`Tenant not found for shop: ${shopDomain}`);
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify webhook signature (use access token as secret for now)
    // In production, use a dedicated webhook secret
    const bodyString = req.body.toString();
    const isValid = verifyShopifyWebhook(bodyString, signature, tenant.accessToken);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const data = JSON.parse(bodyString);

    // Handle different webhook topics
    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
        await handleOrderWebhook(tenant.id, tenant.shopDomain, tenant.accessToken, data);
        break;

      case 'customers/create':
      case 'customers/update':
        await handleCustomerWebhook(tenant.id, tenant.shopDomain, tenant.accessToken, data);
        break;

      case 'products/create':
      case 'products/update':
        await handleProductWebhook(tenant.id, tenant.shopDomain, tenant.accessToken, data);
        break;

      case 'orders/paid':
        await handleOrderWebhook(tenant.id, tenant.shopDomain, tenant.accessToken, data);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

async function handleOrderWebhook(tenantId: string, shopDomain: string, accessToken: string, orderData: any) {
  try {
    const ingestionService = new IngestionService(tenantId, shopDomain, accessToken);
    
    // Sync just this order
    const shopifyService = ingestionService['shopifyService'];
    const shopifyOrder = await shopifyService.getOrder(orderData.id.toString());
    
    if (shopifyOrder) {
      // Ingest this specific order
      await ingestionService.ingestOrders();
    }
  } catch (error) {
    console.error('Error handling order webhook:', error);
  }
}

async function handleCustomerWebhook(tenantId: string, shopDomain: string, accessToken: string, customerData: any) {
  try {
    const ingestionService = new IngestionService(tenantId, shopDomain, accessToken);
    await ingestionService.ingestCustomers();
  } catch (error) {
    console.error('Error handling customer webhook:', error);
  }
}

async function handleProductWebhook(tenantId: string, shopDomain: string, accessToken: string, productData: any) {
  try {
    const ingestionService = new IngestionService(tenantId, shopDomain, accessToken);
    await ingestionService.ingestProducts();
  } catch (error) {
    console.error('Error handling product webhook:', error);
  }
}

export default router;

