FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

---

## `backend/.dockerignore`
```
node_modules
.env
```

---

## `backend/.env.example`
```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_uri_here
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
ADMIN_EMAIL=your_email_here
ADMIN_PASSWORD=your_password_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STAFF_CREATION_SECRET=your_staff_secret