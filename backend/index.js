const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO
const socketConfig = require('./socket');
socketConfig.init(server);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); 
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' 
    ? '*' 
    : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : '*'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Log requests and responses for debugging 401s
const fs = require('fs');
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode === 401) {
      const logMsg = `[${new Date().toISOString()}] 401 Error on ${req.method} ${req.url}\n` +
                     `Headers: ${JSON.stringify(req.headers)}\n` +
                     `Response Body: ${body}\n\n`;
      fs.appendFileSync('/Users/yovelr/Softrate/task-management/backend/debug_errors.txt', logMsg);
    }
    return originalSend.apply(res, arguments);
  };
  next();
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many auth requests from this IP, please try again after 15 minutes' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Swagger documentation options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { background-color: #24292e; } .swagger-ui .topbar .download-url-wrapper .select-label select { border: 2px solid #4caf50; } .swagger-ui .info .title { color: #333; } .swagger-ui .scheme-container { background-color: #f5f5f5; }',
  customSiteTitle: 'Tickkk API Documentation',
  customfavIcon: '/favicon.ico',
  explorer: true,
};

// Swagger documentation route
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, swaggerOptions));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/organizations', require('./routes/organization.routes'));
app.use('/api/ai', require('./routes/ai.routes'));

app.get('', (req, res) => {
    res.send('API is running... <br><a href="/api-docs">View API Documentation</a>');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});