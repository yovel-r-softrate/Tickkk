const Task = require("../models/task.model");
const User = require("../models/user.model");
const Activity = require("../models/activity.model");
const { successResponse, errorResponse } = require("../utils/response");
const { getIo } = require("../socket");

function broadcastToRoom(organizationId, userId, event, data) {
  try {
    const io = getIo();
    if (organizationId) {
      console.log(`Broadcasting ${event} to room: org_${organizationId}`);
      io.to(`org_${organizationId}`).emit(event, data);
    } else if (userId) {
      console.log(`Broadcasting ${event} to room: user_${userId}`);
      io.to(`user_${userId}`).emit(event, data);
    }
  } catch (err) {
    console.error("Socket broadcast skipped/failed:", err.message);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, priority, userId, subtasks } = req.body;
    
    const assignedUser = await User.findById(userId);
    if (!assignedUser) {
      return errorResponse(res, 404, "Assigned user not found");
    }

    const currentUser = req.currentUser;
    if (!currentUser.organization) {
      if (assignedUser._id.toString() !== currentUser._id.toString()) {
        return errorResponse(res, 403, "Users without an organization can only assign tasks to themselves");
      }
    } else if (currentUser.role !== 'super') {
      if (!assignedUser.organization || assignedUser.organization.toString() !== currentUser.organization.toString()) {
         return errorResponse(res, 403, "Cannot assign tasks to users outside your organization");
      }
    }
    
    const newTask = new Task({
      title,
      description,
      deadline,
      priority,
      user: userId,
      organization: assignedUser.organization,
      subtasks: subtasks || []
    });
    await newTask.save();

    // Log activity
    await new Activity({
      task: newTask._id,
      user: req.user._id,
      action: "created",
      details: `Task created and assigned to ${assignedUser.email}`,
      organization: assignedUser.organization
    }).save();

    // Populate user before broadcasting so frontend can compare user IDs
    const populatedTask = await Task.findById(newTask._id).populate('user', 'email');
    
    // Broadcast live event
    broadcastToRoom(assignedUser.organization, assignedUser._id, "taskCreated", {
      ...populatedTask.toObject(),
      assignedUserId: userId.toString()
    });

    successResponse(res, 201, "Task created successfully");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = req.currentUser;
    const filter = user.organization 
      ? { organization: user.organization } 
      : { user: user._id, organization: null };

    if (user.role !== 'admin' && user.role !== 'super') {
      filter.user = user._id;
    }

    const tasks = await Task.find(filter)
    .populate('user', 'email')
    .skip(skip)
    .limit(limit);

    const totalTasks = await Task.countDocuments(filter);

    successResponse(res, 200, "Tasks retrieved successfully", {
      tasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: page
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get ongoing tasks
exports.getOngoingTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const titleSearch = req.query.titleSearch || "";
    const descriptionSearch = req.query.descriptionSearch || "";
    const priority = req.query.priority || "";
    const sortBy = req.query.sortBy || "deadline";
    const order = req.query.order === "desc" ? -1 : 1;

    const user = req.currentUser;
    const filter = { completed: false };
    
    if (user.organization) {
      filter.organization = user.organization;
    } else {
      filter.user = user._id;
      filter.organization = null;
    }

    if (user.role !== 'admin' && user.role !== 'super') {
      filter.user = user._id;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } }
      ];
    }
    
    if (titleSearch) {
        filter.title = { $regex: escapeRegex(titleSearch), $options: "i" };
    }
    
    if (descriptionSearch) {
        filter.description = { $regex: escapeRegex(descriptionSearch), $options: "i" };
    }

    if (priority) {
      filter.priority = priority;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = order;

    const tasks = await Task.find(filter)
    .populate('user', 'email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
    
    const totalTasks = await Task.countDocuments(filter);

    successResponse(res, 200, "Ongoing tasks retrieved successfully", {
      tasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: page,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get completed tasks
exports.getCompletedTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const titleSearch = req.query.titleSearch || "";
    const descriptionSearch = req.query.descriptionSearch || "";
    const priority = req.query.priority || "";

    const user = req.currentUser;
    const filter = { completed: true };
    
    if (user.organization) {
      filter.organization = user.organization;
    } else {
      filter.user = user._id;
      filter.organization = null;
    }

    if (user.role !== 'admin' && user.role !== 'super') {
      filter.user = user._id;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } }
      ];
    }
    
    if (titleSearch) {
        filter.title = { $regex: escapeRegex(titleSearch), $options: "i" };
    }
    
    if (descriptionSearch) {
        filter.description = { $regex: escapeRegex(descriptionSearch), $options: "i" };
    }

    if (priority) {
      filter.priority = priority;
    }

    const tasks = await Task.find(filter)
      .sort({ updatedAt: -1 })  // Sort by most recently updated first
      .populate('user', 'email')
      .skip(skip)
      .limit(limit);
      
    const totalTasks = await Task.countDocuments(filter);

    // Ensure we're sending back the proper metadata
    successResponse(res, 200, "Completed tasks retrieved successfully", {
      tasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: page,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get all tasks for a user
exports.getAllTasksForUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ user: req.user._id })
      .skip(skip)
      .limit(limit);
    const totalTasks = await Task.countDocuments({ user: req.user._id });

    successResponse(res, 200, "Tasks retrieved successfully", {
      tasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: page,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get a single task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id }).populate(
      "user",
      "-password"
    );
    if (!task) {
      return errorResponse(res, 404, "Task not found");
    }

    const currentUser = req.currentUser;
    if (currentUser.role !== 'super') {
      if (!currentUser.organization) {
        if (task.user._id.toString() !== currentUser._id.toString()) {
          return errorResponse(res, 403, "Not authorized to view this task");
        }
      } else if (!task.organization || task.organization.toString() !== currentUser.organization.toString()) {
        return errorResponse(res, 403, "Not authorized to view this task");
      }
    }

    successResponse(res, 200, "Task retrieved successfully", task);
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return errorResponse(res, 404, "Task not found");
    }

    const currentUser = req.currentUser;
    if (currentUser.role !== 'super') {
      if (task.user.toString() !== req.user._id.toString()) {
        if (!currentUser.organization) {
           return errorResponse(res, 403, "Not authorized to update this task");
        } else if (currentUser.role !== 'admin' || !task.organization || task.organization.toString() !== currentUser.organization.toString()) {
           return errorResponse(res, 403, "Not authorized to update this task");
        }
      }
    }
    
    let action = "updated";
    let details = "Task details updated";

    if (req.body.completed !== undefined && req.body.completed !== task.completed) {
      action = "status_changed";
      details = req.body.completed ? "Task marked as completed" : "Task marked as ongoing";
    } else if (req.body.subtasks) {
      action = "subtask_toggled";
      details = "Checklist updated";
    }

    const allowedFields = ['title', 'description', 'deadline', 'priority', 'completed', 'subtasks'];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id, 
      updateData,
      { new: true }
    ).populate('user', 'email');
    
    await new Activity({
      task: updatedTask._id,
      user: req.user._id,
      action: action,
      details: details,
      organization: task.organization
    }).save();

    // Broadcast live event
    broadcastToRoom(task.organization, task.user, "taskUpdated", updatedTask);

    return successResponse(res, 200, "Task updated successfully", updatedTask);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the task first to ensure it exists
    const task = await Task.findById(id);
    
    if (!task) {
      return errorResponse(res, 404, "Task not found");
    }
    
    const currentUser = req.currentUser;
    if (currentUser.role !== 'super') {
      if (task.user.toString() !== req.user._id.toString()) {
        if (!currentUser.organization) {
           return errorResponse(res, 403, "Not authorized to delete this task");
        } else if (currentUser.role !== 'admin' || !task.organization || task.organization.toString() !== currentUser.organization.toString()) {
           return errorResponse(res, 403, "Not authorized to delete this task");
        }
      }
    }
    
    // Log activity
    await new Activity({
      task: id,
      user: req.user._id,
      action: "deleted",
      details: `Task "${task.title}" was deleted`,
      organization: task.organization
    }).save();

    // Delete the task
    await Task.findByIdAndDelete(id);
    
    // Broadcast live event
    broadcastToRoom(task.organization, task.user, "taskDeleted", id);
    
    successResponse(res, 200, "Task deleted successfully");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get task statistics
exports.getTaskStats = async (req, res) => {
  try {
    const user = req.currentUser;
    const matchFilter = user.organization 
      ? { organization: user.organization } 
      : { user: user._id, organization: null };

    if (user.role !== 'admin' && user.role !== 'super') {
      matchFilter.user = user._id;
    }

    const stats = await Task.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
          pending: { $sum: { $cond: ["$completed", 0, 1] } },
          highPriority: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] } },
          mediumPriority: { $sum: { $cond: [{ $eq: ["$priority", "Medium"] }, 1, 0] } },
          lowPriority: { $sum: { $cond: [{ $eq: ["$priority", "Low"] }, 1, 0] } }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      total: 0,
      completed: 0,
      pending: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };

    successResponse(res, 200, "Stats retrieved successfully", result);
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// Get activity log for a task
exports.getTaskActivities = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, "Task not found");
    }

    const currentUser = req.currentUser;
    if (currentUser.role !== 'super') {
      if (!currentUser.organization) {
        if (task.user.toString() !== currentUser._id.toString()) {
          return errorResponse(res, 403, "Not authorized to view this task's activities");
        }
      } else if (!task.organization || task.organization.toString() !== currentUser.organization.toString()) {
        return errorResponse(res, 403, "Not authorized to view this task's activities");
      }
    }

    const activities = await Activity.find({ task: req.params.id })
      .populate("user", "email")
      .sort({ createdAt: -1 });

    successResponse(res, 200, "Activities retrieved successfully", activities);
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};
