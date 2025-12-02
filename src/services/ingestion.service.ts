import prisma from '../config/database';
import { ShopifyService, ShopifyCustomer, ShopifyProduct, ShopifyOrder } from './shopify.service';

export class IngestionService {
  private shopifyService: ShopifyService;
  private tenantId: string;

  constructor(tenantId: string, shopDomain: string, accessToken: string) {
    this.tenantId = tenantId;
    this.shopifyService = new ShopifyService(shopDomain, accessToken);
  }

  // Ingest all customers
  async ingestCustomers(): Promise<{ created: number; updated: number }> {
    const shopifyCustomers = await this.shopifyService.getCustomers();
    let created = 0;
    let updated = 0;

    for (const shopifyCustomer of shopifyCustomers) {
      const existing = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyId: {
            tenantId: this.tenantId,
            shopifyId: shopifyCustomer.id.toString(),
          },
        },
      });

      const data = {
        shopifyId: shopifyCustomer.id.toString(),
        email: shopifyCustomer.email || null,
        firstName: shopifyCustomer.first_name || null,
        lastName: shopifyCustomer.last_name || null,
        phone: shopifyCustomer.phone || null,
        totalSpent: parseFloat(shopifyCustomer.total_spent) || 0,
        ordersCount: shopifyCustomer.orders_count || 0,
        shopifyCreatedAt: shopifyCustomer.created_at ? new Date(shopifyCustomer.created_at) : null,
        shopifyUpdatedAt: shopifyCustomer.updated_at ? new Date(shopifyCustomer.updated_at) : null,
      };

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.customer.create({
          data: {
            ...data,
            tenantId: this.tenantId,
          },
        });
        created++;
      }
    }

    return { created, updated };
  }

  // Ingest all products
  async ingestProducts(): Promise<{ created: number; updated: number }> {
    const shopifyProducts = await this.shopifyService.getProducts();
    let created = 0;
    let updated = 0;

    for (const shopifyProduct of shopifyProducts) {
      const existing = await prisma.product.findUnique({
        where: {
          tenantId_shopifyId: {
            tenantId: this.tenantId,
            shopifyId: shopifyProduct.id.toString(),
          },
        },
      });

      // Get first variant for pricing
      const firstVariant = shopifyProduct.variants?.[0];
      const price = firstVariant ? parseFloat(firstVariant.price) : null;
      const compareAtPrice = firstVariant?.compare_at_price
        ? parseFloat(firstVariant.compare_at_price)
        : null;
      const inventoryQuantity = firstVariant?.inventory_quantity || 0;

      const data = {
        shopifyId: shopifyProduct.id.toString(),
        title: shopifyProduct.title,
        handle: shopifyProduct.handle || null,
        vendor: shopifyProduct.vendor || null,
        productType: shopifyProduct.product_type || null,
        status: shopifyProduct.status || null,
        price: price,
        compareAtPrice: compareAtPrice,
        inventoryQuantity: inventoryQuantity,
        shopifyCreatedAt: shopifyProduct.created_at ? new Date(shopifyProduct.created_at) : null,
        shopifyUpdatedAt: shopifyProduct.updated_at ? new Date(shopifyProduct.updated_at) : null,
      };

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            ...data,
            tenantId: this.tenantId,
          },
        });
        created++;
      }
    }

    return { created, updated };
  }

  // Ingest all orders
  async ingestOrders(): Promise<{ created: number; updated: number }> {
    const shopifyOrders = await this.shopifyService.getOrders();
    let created = 0;
    let updated = 0;

    for (const shopifyOrder of shopifyOrders) {
      const existing = await prisma.order.findUnique({
        where: {
          tenantId_shopifyId: {
            tenantId: this.tenantId,
            shopifyId: shopifyOrder.id.toString(),
          },
        },
      });

      // Find or create customer if order has customer
      let customerId: string | null = null;
      if (shopifyOrder.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyId: {
              tenantId: this.tenantId,
              shopifyId: shopifyOrder.customer.id.toString(),
            },
          },
        });
        customerId = customer?.id || null;
      }

      const orderData = {
        shopifyId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.order_number?.toString() || null,
        email: shopifyOrder.email || null,
        financialStatus: shopifyOrder.financial_status || null,
        fulfillmentStatus: shopifyOrder.fulfillment_status || null,
        totalPrice: parseFloat(shopifyOrder.total_price) || 0,
        subtotalPrice: shopifyOrder.subtotal_price ? parseFloat(shopifyOrder.subtotal_price) : null,
        totalTax: shopifyOrder.total_tax ? parseFloat(shopifyOrder.total_tax) : null,
        totalDiscounts: shopifyOrder.total_discounts
          ? parseFloat(shopifyOrder.total_discounts)
          : null,
        currency: shopifyOrder.currency || 'USD',
        customerId: customerId,
        shopifyCreatedAt: shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : null,
        shopifyUpdatedAt: shopifyOrder.updated_at ? new Date(shopifyOrder.updated_at) : null,
      };

      let order;
      if (existing) {
        order = await prisma.order.update({
          where: { id: existing.id },
          data: orderData,
        });
        updated++;
      } else {
        order = await prisma.order.create({
          data: {
            ...orderData,
            tenantId: this.tenantId,
          },
        });
        created++;
      }

      // Ingest order items
      if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
        // Delete existing order items
        await prisma.orderItem.deleteMany({
          where: { orderId: order.id },
        });

        // Create new order items
        for (const item of shopifyOrder.line_items) {
          let productId: string | null = null;
          if (item.product_id) {
            const product = await prisma.product.findUnique({
              where: {
                tenantId_shopifyId: {
                  tenantId: this.tenantId,
                  shopifyId: item.product_id.toString(),
                },
              },
            });
            productId = product?.id || null;
          }

          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: productId,
              shopifyProductId: item.product_id?.toString() || null,
              title: item.title,
              quantity: item.quantity,
              price: parseFloat(item.price) || 0,
              totalDiscount: item.total_discount ? parseFloat(item.total_discount) : null,
              sku: item.sku || null,
              variantTitle: item.variant_title || null,
            },
          });
        }
      }
    }

    return { created, updated };
  }

  // Ingest all data (customers, products, orders)
  async ingestAll(): Promise<{
    customers: { created: number; updated: number };
    products: { created: number; updated: number };
    orders: { created: number; updated: number };
  }> {
    const [customers, products, orders] = await Promise.all([
      this.ingestCustomers(),
      this.ingestProducts(),
      this.ingestOrders(),
    ]);

    return { customers, products, orders };
  }

  // Record a custom event
  async recordEvent(
    eventType: string,
    customerId?: string,
    orderId?: string,
    metadata?: any
  ): Promise<void> {
    await prisma.event.create({
      data: {
        tenantId: this.tenantId,
        eventType,
        customerId: customerId || null,
        orderId: orderId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

