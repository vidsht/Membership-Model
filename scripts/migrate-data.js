// MongoDB to PostgreSQL (Prisma) Data Migration Script
// Run: node scripts/migrate-data.js

const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });

// Load Mongoose models
const User = require('../backend/models/User');
const Plan = require('../backend/models/Plan');
const Business = require('../backend/models/Business');
const Deal = require('../backend/models/Deal');
const DealRedemption = require('../backend/models/DealRedemption');
const AdminSettings = require('../backend/models/AdminSettings');

const prisma = new PrismaClient();

async function migrate() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // 1. Migrate Plans
  const plans = await Plan.find();
  for (const plan of plans) {
    await prisma.plan.create({
      data: {
        id: plan._id.toString(),
        name: plan.name,
        key: plan.key,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        description: plan.description,
        isActive: plan.isActive,
        maxUsers: plan.maxUsers,
        billingCycle: plan.billingCycle,
        priority: plan.priority,
        metadata: plan.metadata,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      }
    });
  }
  console.log('Plans migrated');

  // 2. Migrate Users
  const users = await User.find();
  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        password: user.password,
        phone: user.phone,
        address: user.address,
        profilePicture: user.profilePicture,
        userType: user.userType,
        adminRole: user.adminRole,
        permissions: user.permissions,
        businessInfoId: user.businessInfo?._id?.toString() || null,
        membershipType: user.membershipType,
        membershipNumber: user.membershipNumber,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        preferences: user.preferences
      }
    });
  }
  console.log('Users migrated');

  // 3. Migrate Businesses
  const businesses = await Business.find();
  for (const business of businesses) {
    await prisma.business.create({
      data: {
        id: business._id.toString(),
        businessName: business.businessName,
        ownerId: business.ownerId.toString(),
        ownerName: business.ownerName,
        businessDescription: business.businessDescription,
        businessCategory: business.businessCategory,
        businessAddress: business.businessAddress,
        location: business.location,
        contactInfo: business.contactInfo,
        socialMedia: business.socialMedia,
        businessHours: business.businessHours,
        logoUrl: business.logoUrl,
        coverImageUrl: business.coverImageUrl,
        galleryImages: business.galleryImages,
        businessLicense: business.businessLicense,
        taxId: business.taxId,
        isVerified: business.isVerified,
        verificationDate: business.verificationDate,
        membershipLevel: business.membershipLevel,
        featuredUntil: business.featuredUntil,
        ratingAverage: business.rating?.average || 0,
        ratingCount: business.rating?.count || 0,
        status: business.status,
        tags: business.tags,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      }
    });
  }
  console.log('Businesses migrated');

  // 4. Migrate Deals
  const deals = await Deal.find();
  for (const deal of deals) {
    await prisma.deal.create({
      data: {
        id: deal._id.toString(),
        title: deal.title,
        description: deal.description,
        businessId: deal.businessId.toString(),
        businessName: deal.businessName,
        discount: deal.discount,
        discountType: deal.discountType,
        category: deal.category,
        validFrom: deal.validFrom,
        validUntil: deal.validUntil,
        accessLevel: deal.accessLevel,
        termsConditions: deal.termsConditions,
        couponCode: deal.couponCode,
        maxRedemptions: deal.maxRedemptions,
        redemptionCount: deal.redemptionCount,
        imageUrl: deal.imageUrl,
        viewCount: deal.viewCount,
        status: deal.status,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt
      }
    });
  }
  console.log('Deals migrated');

  // 5. Migrate DealRedemptions
  const redemptions = await DealRedemption.find();
  for (const redemption of redemptions) {
    await prisma.dealRedemption.create({
      data: {
        id: redemption._id.toString(),
        dealId: redemption.dealId.toString(),
        userId: redemption.userId.toString(),
        userName: redemption.userName,
        userEmail: redemption.userEmail,
        membershipNumber: redemption.membershipNumber,
        businessId: redemption.businessId?.toString() || null,
        redeemedAt: redemption.redeemedAt,
        status: redemption.status,
        notes: redemption.notes,
        redeemedBy: redemption.redeemedBy,
        locationData: redemption.locationData,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt
      }
    });
  }
  console.log('DealRedemptions migrated');

  // 6. Migrate AdminSettings
  const settings = await AdminSettings.find();
  for (const setting of settings) {
    await prisma.adminSettings.create({
      data: {
        id: setting._id.toString(),
        settings: setting.settings,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      }
    });
  }
  console.log('AdminSettings migrated');

  await mongoose.disconnect();
  await prisma.$disconnect();
  console.log('Migration complete!');
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
