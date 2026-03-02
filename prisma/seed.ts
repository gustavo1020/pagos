import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const nodeEnv = process.env.NODE_ENV || "development";
  console.log(`Running seed in ${nodeEnv} mode...`);

  // Load users from config/users.json or users.prod.json
  const usersFileName = nodeEnv === "production" ? "users.prod.json" : "users.json";
  const usersPath = path.join(process.cwd(), "config", usersFileName);
  
  if (!fs.existsSync(usersPath)) {
    console.warn(`⚠ Warning: ${usersFileName} not found at ${usersPath}`);
    console.log("Skipping seed...");
    return;
  }

  const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  if (usersData.length === 0) {
    console.log("ℹ No users to seed. Skipping user creation.");
    return;
  }

  console.log("Clearing existing users...");
  await prisma.user.deleteMany();

  // Create users with hashed passwords
  console.log("Creating seed users...");
  for (const user of usersData) {
    const hashedPassword = await hash(user.password, 10);
    const createdUser = await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        passwordHash: hashedPassword,
        role: user.role,
      },
    });
    console.log(`✓ Created user: ${createdUser.username} (${createdUser.role})`);
  }

  // Verify users were created
  const userCount = await prisma.user.count();
  console.log(`\nSeed completed! Total users: ${userCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
