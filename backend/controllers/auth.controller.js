const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user.model");
const Organization = require("../models/organization.model");
const { generateToken, successResponse, errorResponse } = require("../utils/response");
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         expiresIn:
 *           type: integer
 *           description: Token expiration in seconds
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: User ID
 *             email:
 *               type: string
 *               description: User email
 *             role:
 *               type: string
 *               description: User role
 *             organization:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Organization ID
 *                 name:
 *                   type: string
 *                   description: Organization name
 *                 role:
 *                   type: string
 *                   description: User's role in the organization
 *         success:
 *           type: boolean
 *           description: Success status
 *         message:
 *           type: string
 *           description: Response message
 */

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, organization, createOrg } = req.body;
    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    if (password.length < 8) {
      return errorResponse(res, 400, "Password must be at least 8 characters");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      role: 'user'
    });
    await newUser.save();
    const token = generateToken(newUser);

    let orgInfo = null;
    let userRole = 'user';

    if (organization && createOrg) {
      const existingOrg = await Organization.findOne({ name: organization });
      if (existingOrg) {
        return res.status(400).json({
          message: "This organization already exists. Please join as a member instead.",
          suggestRole: 'member'
        });
      }

      const newOrg = await Organization.create({
        name: organization,
        owner: newUser._id,
        members: [{ user: newUser._id, role: 'admin' }]
      });

      userRole = 'admin';
      await User.findByIdAndUpdate(newUser._id, {
        $set: { organization: newOrg._id, role: 'admin' }
      });

      orgInfo = {
        id: newOrg._id,
        name: newOrg.name,
        role: 'admin'
      };
    } else if (organization) {
      const existingOrg = await Organization.findOne({ name: organization });
      if (existingOrg) {
        existingOrg.members.push({
          user: newUser._id,
          role: 'member'
        });
        await existingOrg.save();

        await User.findByIdAndUpdate(newUser._id, {
          $set: { organization: existingOrg._id }
        });

        orgInfo = {
          id: existingOrg._id,
          name: existingOrg.name,
          role: 'member'
        };
      } else {
        // Rollback user creation
        await User.findByIdAndDelete(newUser._id);
        return res.status(400).json({
          message: "Organization not found. Please check the name or register as an administrator to create it.",
          success: false
        });
      }
    }

    res
      .status(201)
      .json({
        token,
        expiresIn: 3600,
        user: {
          _id: newUser._id,
          email: newUser.email,
          role: userRole,
          organization: orgInfo
        },
        success: true,
        message: 'User registered successfully'
      });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('organization', 'name');
    if (!user) {
      return errorResponse(res, 404, "User not found");
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return errorResponse(res, 401, "Invalid credentials");
    }
    const token = generateToken(user);
    res.status(200).json({
      token,
      expiresIn: 3600,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        organization: user.organization ? {
          id: user.organization._id,
          name: user.organization.name,
        } : null,
      },
      success: true,
      message: 'Login successful'
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.logout = (req, res) => {
  successResponse(res, 200, "User logged out");
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    successResponse(res, 200, "Users retrieved successfully", users);
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};
