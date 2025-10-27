// MongoDB initialization script
db = db.getSiblingDB('uplink');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'name', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        role: {
          enum: ['creator', 'client', 'admin']
        }
      }
    }
  }
});

db.createCollection('files', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['creatorId', 'originalName', 'fileName', 'fileType', 'mimeType', 'size', 's3Key', 's3Url', 'status'],
      properties: {
        fileType: {
          enum: ['video', 'image', 'document', '3d', 'audio']
        },
        status: {
          enum: ['uploading', 'processing', 'ready', 'delivered', 'failed']
        },
        size: {
          bsonType: 'number',
          minimum: 0
        },
        price: {
          bsonType: 'number',
          minimum: 0
        }
      }
    }
  }
});

db.createCollection('payments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fileId', 'creatorId', 'clientId', 'amount', 'currency', 'status', 'paymentMethod'],
      properties: {
        status: {
          enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
        },
        paymentMethod: {
          enum: ['upi', 'card', 'netbanking', 'wallet']
        },
        amount: {
          bsonType: 'number',
          minimum: 0
        },
        currency: {
          bsonType: 'string',
          enum: ['INR']
        }
      }
    }
  }
});

db.createCollection('analytics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fileId', 'creatorId', 'eventType'],
      properties: {
        eventType: {
          enum: ['view', 'download', 'payment', 'share']
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.files.createIndex({ creatorId: 1 });
db.files.createIndex({ fileType: 1 });
db.files.createIndex({ status: 1 });
db.files.createIndex({ isPublic: 1 });
db.files.createIndex({ s3Key: 1 }, { unique: true });
db.files.createIndex({ createdAt: -1 });

db.payments.createIndex({ fileId: 1 });
db.payments.createIndex({ creatorId: 1 });
db.payments.createIndex({ clientId: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ cashfreeOrderId: 1 }, { unique: true, sparse: true });
db.payments.createIndex({ createdAt: -1 });

db.analytics.createIndex({ fileId: 1 });
db.analytics.createIndex({ creatorId: 1 });
db.analytics.createIndex({ eventType: 1 });
db.analytics.createIndex({ createdAt: -1 });
db.analytics.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // TTL: 1 year

print('Database initialized successfully');
