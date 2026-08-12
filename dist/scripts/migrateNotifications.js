"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNotificationMigration = runNotificationMigration;
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../config/db"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Merchant_1 = __importDefault(require("../models/Merchant"));
dotenv_1.default.config();
async function runNotificationMigration() {
    console.log('🚀 Starting Controlled Notification Migration...');
    await (0, db_1.default)();
    const unmigratedNotifs = await Notification_1.default.find({
        $or: [{ recipientUserId: { $exists: false } }, { recipientUserId: null }, { recipientUserId: '' }],
    });
    console.log(`📊 Found ${unmigratedNotifs.length} unmigrated historical notification documents.`);
    let migratedCount = 0;
    let skippedUnmappedCount = 0;
    const merchants = await Merchant_1.default.find().select('merchantId userId').lean();
    const merchantUserMap = new Map();
    merchants.forEach((m) => merchantUserMap.set(m.merchantId, m.userId));
    for (const notif of unmigratedNotifs) {
        let targetUserId = merchantUserMap.get(notif.merchantId);
        // Fallback if merchantId starts with m_
        if (!targetUserId && notif.merchantId?.startsWith('m_')) {
            targetUserId = notif.merchantId.substring(2);
        }
        if (targetUserId) {
            notif.recipientUserId = targetUserId;
            if (!notif.eventId)
                notif.eventId = `legacy_${notif._id}`;
            if (!notif.dedupeKey)
                notif.dedupeKey = `legacy:${targetUserId}:${notif._id}`;
            if (!notif.broadcastScope)
                notif.broadcastScope = 'USER';
            if (!notif.notificationStatus) {
                notif.notificationStatus = notif.clearedAt ? 'CLEARED' : 'ACTIVE';
            }
            if (!notif.deliveryStatus)
                notif.deliveryStatus = 'SOCKET_DELIVERED';
            if (!notif.channels)
                notif.channels = { inApp: true, socket: true, email: false };
            await notif.save();
            migratedCount++;
        }
        else {
            console.warn(`⚠️ Could not resolve unambiguous recipientUserId for Notification ID: ${notif._id} (merchantId: ${notif.merchantId})`);
            skippedUnmappedCount++;
        }
    }
    console.log('✅ Controlled Notification Migration Completed!');
    console.log(`   - Successfully Migrated: ${migratedCount}`);
    console.log(`   - Skipped / Unmapped: ${skippedUnmappedCount}`);
    return { migratedCount, skippedUnmappedCount };
}
if (require.main === module) {
    runNotificationMigration()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    });
}
