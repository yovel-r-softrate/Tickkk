const { successResponse, errorResponse } = require("../utils/response");
const { getHrmsUsers } = require("../utils/hrms.client");

exports.getUsers = async (req, res) => {
  try {
    const token = req.header('Authorization');
    const hrmsUsers = await getHrmsUsers(req.user.companyId, token);
    
    return successResponse(res, 200, "Users retrieved successfully", {
      users: hrmsUsers,
      totalUsers: hrmsUsers.length,
      totalPages: 1,
      currentPage: 1,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getUsersByOrganization = exports.getUsers;

exports.getProfile = async (req, res) => {
  try {
    const token = req.header('Authorization');
    const hrmsUsers = await getHrmsUsers(req.user.companyId, token);
    const myProfile = hrmsUsers.find(u => u._id.toString() === req.user.id.toString());
    
    if (!myProfile) {
      return successResponse(res, 200, "Profile retrieved", {
        name: req.user.name,
        email: req.user.email,
        role: req.user.roleName || 'User',
        type: 'User'
      });
    }
    
    return successResponse(res, 200, "Profile retrieved", myProfile);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

