const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const Task = require('../models/task.model');

async function migrate() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI missing in .env");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for migration");

    const backupPath = path.resolve(__dirname, 'task_user_backup.md');
    if (!fs.existsSync(backupPath)) {
      console.error("Backup file not found at", backupPath);
      process.exit(1);
    }

    const content = fs.readFileSync(backupPath, 'utf8');
    const lines = content.split('\n');
    let migratedCount = 0;

    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('Task ID') && !line.includes('---')) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 6) {
          const taskId = parts[1];
          const hrmsUserId = parts[5];
          
          // You might also want to set hrmsCompanyId if known, but for now we link the user
          if (taskId && hrmsUserId && hrmsUserId !== '') {
            // Update both the user and the organization (companyId) so it scopes properly in multi-tenant queries
            await Task.findByIdAndUpdate(taskId, {
              user: hrmsUserId,
              organization: '6a16a279b6cbac52ba3f726d' // softrateglobal company ID
            });
            console.log(`Migrated task ${taskId} to HRMS user ${hrmsUserId} and company 6a16a279b6cbac52ba3f726d`);
            migratedCount++;
          }
        }
      }
    }

    console.log(`Migration complete. Updated ${migratedCount} tasks.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrate();
