---
description: Deploy the application to Firebase Hosting
---

# Deploy to Firebase Hosting

Since your application already uses Firebase for the database, deploying it to **Firebase Hosting** is the best and easiest option. This will give you a secure, global URL (e.g., `https://your-app-id.web.app`) that anyone can access.

## Prerequisites
- You must have the Firebase CLI installed.
- You must be logged in to your Google account that owns the Firebase project.

## Steps

1.  **Install Firebase CLI** (if not already installed):
    ```powershell
    npm install -g firebase-tools
    ```

2.  **Login to Firebase**:
    This will open a browser window for you to authenticate.
    ```powershell
    firebase login
    ```

3.  **Initialize Firebase Hosting**:
    Run this command in your project root (`swarn-sale-app`):
    ```powershell
    firebase init hosting
    ```
    - **Select your project**: Choose `sales-management-app-d7599` (from your config).
    - **Public directory**: Type `dist` (this is where Vite builds your app).
    - **Configure as a single-page app**: Type `Yes` (Important for React Router).
    - **Set up automatic builds and deploys with GitHub**: Type `No` (unless you want this).
    - **Overwrite index.html**: Type `No` (Vite handles this).

4.  **Build the Application**:
    Create the production build of your app.
    ```powershell
    // turbo
    npm run build
    ```

5.  **Deploy**:
    Upload the `dist` folder to Firebase.
    ```powershell
    // turbo
    firebase deploy
    ```

6.  **Access your App**:
    The terminal will show you the "Hosting URL". You can share this link with anyone.
