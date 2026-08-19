const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Task = require('../models/task.model');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');

async function exportBackup() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is not defined in .env");
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const tasks = await Task.find().populate('user', 'email name').populate('organization', 'name');
    
    let markdownContent = `# Task User Mapping Backup\n\n`;
    markdownContent += `| Task ID | Task Title | Local User ID | Local User Email | HRMS User ID |\n`;
    markdownContent += `|---|---|---|---|---|\n`;

    for (const task of tasks) {
      const taskId = task._id.toString();
      const taskTitle = task.title;
      const localUserId = task.user ? task.user._id.toString() : 'N/A';
      const localUserEmail = task.user ? task.user.email : 'N/A';
      
      markdownContent += `| ${taskId} | ${taskTitle} | ${localUserId} | ${localUserEmail} |  |\n`;
    }

    const backupPath = path.resolve(__dirname, 'task_user_backup.md');
    fs.writeFileSync(backupPath, markdownContent);
    console.log(`Backup created at ${backupPath}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error during backup:", err);
    process.exit(1);
  }
}

exportBackup();
