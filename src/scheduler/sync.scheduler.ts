import cron from 'node-cron';
import prisma from '../config/database';
import { IngestionService } from '../services/ingestion.service';

// Schedule data sync every 6 hours (configurable via env)
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '0 */6 * * *'; // Every 6 hours

export function scheduleDataSync(): void {
  console.log('📅 Scheduling automatic data sync...');

  cron.schedule(SYNC_INTERVAL, async () => {
    console.log('🔄 Starting scheduled data sync...');

    try {
      // Get all active tenants
      const tenants = await prisma.tenant.findMany();

      for (const tenant of tenants) {
        try {
          console.log(`Syncing data for tenant: ${tenant.shopDomain}`);

          const ingestionService = new IngestionService(
            tenant.id,
            tenant.shopDomain,
            tenant.accessToken
          );

          const result = await ingestionService.ingestAll();

          console.log(`✅ Sync completed for ${tenant.shopDomain}:`, result);
        } catch (error: any) {
          console.error(`❌ Sync failed for ${tenant.shopDomain}:`, error.message);
        }
      }

      console.log('✅ Scheduled data sync completed');
    } catch (error: any) {
      console.error('❌ Scheduled sync error:', error);
    }
  });

  console.log(`✅ Data sync scheduled (interval: ${SYNC_INTERVAL})`);
}

