const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tickkk API',
      version: '1.0.0',
      description: 'API documentation for the Tickkk application',
      contact: {
        name: 'Manthan Ankolekar',
        url: 'https://task-management-app-manthanank.vercel.app/',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://task-management-app-8t3d.vercel.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js', './models/*.js', './controllers/*.js'],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;