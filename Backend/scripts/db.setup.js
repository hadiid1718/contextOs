import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import { connectToDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { AdminUser } from '../src/admin/models/AdminUser.js';

const seedSuperadmin = async () => {
  if (!env.adminEmail) {
    throw new Error('ADMIN_EMAIL is required.');
  }

  if (!env.adminInitialPassword) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required.');
  }

  const passwordHash = await bcrypt.hash(env.adminInitialPassword, 12);
  const normalizedEmail = env.adminEmail.toLowerCase().trim();

  const existing = await AdminUser.findOne({ email: normalizedEmail });

  if (!existing) {
    await AdminUser.create({
      email: normalizedEmail,
      passwordHash,
      role: 'superadmin',
      loginAttempts: 0,
      lockedUntil: null,
    });

    console.log(`Superadmin seeded: ${normalizedEmail}`);
    return;
  }

  existing.passwordHash = passwordHash;
  existing.role = 'superadmin';
  existing.loginAttempts = 0;
  existing.lockedUntil = null;
  await existing.save();

  console.log(`Superadmin updated: ${normalizedEmail}`);
};

const run = async () => {
  try {
    await connectToDatabase();
    await seedSuperadmin();
    console.log('db:setup completed successfully');
  } catch (error) {
    console.error(error?.message || 'db:setup failed');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void run();
