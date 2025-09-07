import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('Password@1234', 10);

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'malay@gmail.com' },
    update: {},
    create: {
      email: 'malay@gmail.com',
      password: hashedPassword,
      name: 'Malay',
      emailVerified: true, // Pre-verified for testing
      zoomConnected: false,
    },
  });

  console.log('✅ Created user:', {
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
  });

  // Create another test user (unverified)
  const unverifiedUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      emailVerified: false,
      zoomConnected: false,
      otp: '123456',
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    },
  });

  console.log('✅ Created unverified user:', {
    email: unverifiedUser.email,
    name: unverifiedUser.name,
    emailVerified: unverifiedUser.emailVerified,
    otp: '123456',
  });

  console.log('🎉 Database seeded successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('------------------------');
  console.log('Verified User:');
  console.log('Email: malay@gmail.com');
  console.log('Password: Password@1234');
  console.log('');
  console.log('Unverified User:');
  console.log('Email: test@example.com');
  console.log('Password: Password@1234');
  console.log('OTP: 123456');
  console.log('------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });