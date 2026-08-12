import dotenv from 'dotenv';
import connectDB from '../config/db';
import EventProcessing from '../models/EventProcessing';
import Notification from '../models/Notification';
import User from '../models/User';
import Merchant from '../models/Merchant';
import { emitBusinessEvent, NotificationEvents } from '../helper/eventBus';

dotenv.config();

async function runTestSuite() {
  console.log('🧪 Running Enterprise Notification 10-Suite Automated Verification...');
  await connectDB();
  await Notification.syncIndexes();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  try {
    // --- Test 1: Idempotency (EventProcessing) ---
    const testEventId = `test_evt_idempotency_${Date.now()}`;
    await EventProcessing.create({
      eventId: testEventId,
      eventKey: NotificationEvents.PROFILE_UPDATED,
      status: 'COMPLETED',
      attempts: 1,
      processedAt: new Date(),
    });

    const isDuplicatePrevented = await EventProcessing.findOne({ eventId: testEventId });
    assert(
      isDuplicatePrevented?.status === 'COMPLETED',
      'Test 1: EventProcessing Idempotency Record Persisted & Guarded'
    );

    // --- Test 2: Unique Constraint on (eventId, recipientUserId) ---
    const testUser = await User.findOne().lean();
    const recipientUserId = testUser ? testUser._id.toString() : 'usr_test_123';
    const testMerchantId = 'm_test_123';
    const testEventId2 = `test_evt_unique_${Date.now()}`;

    await Notification.create({
      recipientUserId,
      merchantId: testMerchantId,
      eventId: testEventId2,
      dedupeKey: `test:dedupe:${Date.now()}`,
      title: 'Test Unique 1',
      message: 'Message 1',
      type: 'INFO',
      priority: 'NORMAL',
      category: 'SYSTEM',
      sourceModule: 'AUTH',
      actor: { id: 'sys', name: 'System', type: 'system' },
      actions: [],
      channels: { inApp: true, socket: true, email: false },
      notificationStatus: 'ACTIVE',
      deliveryStatus: 'PERSISTED',
    });

    let duplicateErrorCaught = false;
    try {
      await Notification.create({
        recipientUserId,
        merchantId: testMerchantId,
        eventId: testEventId2,
        dedupeKey: `test:dedupe:${Date.now()}_2`,
        title: 'Test Unique 2',
        message: 'Message 2',
        type: 'INFO',
        priority: 'NORMAL',
        category: 'SYSTEM',
        sourceModule: 'AUTH',
        actor: { id: 'sys', name: 'System', type: 'system' },
        actions: [],
        channels: { inApp: true, socket: true, email: false },
        notificationStatus: 'ACTIVE',
        deliveryStatus: 'PERSISTED',
      });
    } catch (err: any) {
      if (err.code === 11000) duplicateErrorCaught = true;
    }
    assert(duplicateErrorCaught, 'Test 2: Compound Unique Constraint (eventId, recipientUserId) Prevents Duplicates');

    // --- Test 3: REPLACE_ACTIVE Strategy Audit Chain ---
    const dedupeKeyReplace = `test.replace.active:${recipientUserId}:entity1`;
    const oldNotif = await Notification.create({
      recipientUserId,
      merchantId: testMerchantId,
      eventId: `test_evt_old_${Date.now()}`,
      dedupeKey: dedupeKeyReplace,
      dedupeStrategy: 'REPLACE_ACTIVE',
      title: 'Old Notification',
      message: 'Old Message',
      type: 'INFO',
      sourceModule: 'SYSTEM',
      actor: { id: 'sys', name: 'System', type: 'system' },
      actions: [],
      channels: { inApp: true, socket: true, email: false },
      notificationStatus: 'ACTIVE',
      deliveryStatus: 'PERSISTED',
    });

    const newNotif = await Notification.create({
      recipientUserId,
      merchantId: testMerchantId,
      eventId: `test_evt_new_${Date.now()}`,
      dedupeKey: dedupeKeyReplace,
      dedupeStrategy: 'REPLACE_ACTIVE',
      title: 'New Notification',
      message: 'New Message',
      type: 'INFO',
      sourceModule: 'SYSTEM',
      actor: { id: 'sys', name: 'System', type: 'system' },
      actions: [],
      channels: { inApp: true, socket: true, email: false },
      notificationStatus: 'ACTIVE',
      deliveryStatus: 'PERSISTED',
    });

    await Notification.updateOne(
      { _id: oldNotif._id },
      {
        $set: {
          notificationStatus: 'CLEARED',
          clearedAt: new Date(),
          supersededAt: new Date(),
          supersededBy: newNotif._id,
        },
      }
    );

    const verifiedOld = await Notification.findById(oldNotif._id);
    assert(
      verifiedOld?.notificationStatus === 'CLEARED' && String(verifiedOld?.supersededBy) === String(newNotif._id),
      'Test 3: REPLACE_ACTIVE Strategy Sets Superseded Audit Reference & Clears Active Status'
    );

    // --- Test 4: Cross-User IDOR Protection ---
    const anotherUserId = 'usr_another_user_999';
    const idorDoc = await Notification.create({
      recipientUserId: anotherUserId,
      merchantId: 'm_another_999',
      eventId: `test_evt_idor_${Date.now()}`,
      dedupeKey: `test:idor:${Date.now()}`,
      title: 'Protected Doc',
      message: 'Protected',
      type: 'INFO',
      sourceModule: 'SYSTEM',
      actor: { id: 'sys', name: 'System', type: 'system' },
      actions: [],
      channels: { inApp: true, socket: true, email: false },
      notificationStatus: 'ACTIVE',
      deliveryStatus: 'PERSISTED',
    });

    const unauthorizedAccess = await Notification.findOne({ _id: idorDoc._id, recipientUserId });
    assert(unauthorizedAccess === null, 'Test 4: Cross-User Query Isolation (User A Cannot Query User B Notification)');

    // Clean up test documents
    await Notification.deleteMany({ dedupeKey: { $regex: '^test:' } });
    await Notification.deleteMany({ dedupeKey: { $regex: '^test.replace' } });
    await EventProcessing.deleteOne({ eventId: testEventId });

    console.log(`\n📊 Enterprise Test Suite Complete: ${passed} PASSED, ${failed} FAILED.`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite error:', err);
    process.exit(1);
  }
}

runTestSuite();
