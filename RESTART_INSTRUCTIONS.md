# How to Fix Prisma Client Error

## Problem
The Prisma client hasn't been regenerated with the new Category and Brand models, causing errors like:
- `Cannot read properties of undefined (reading 'findUnique')`
- `Cannot read properties of undefined (reading 'findMany')`

## Solution

1. **Stop the development server**
   - Press `Ctrl+C` in the terminal where `npm run dev` is running

2. **Regenerate Prisma Client**
   ```bash
   npm run db:generate
   ```
   OR
   ```bash
   npx prisma generate
   ```

3. **Restart the development server**
   ```bash
   npm run dev
   ```

After restarting, the Prisma client will include the Category and Brand models, and everything should work correctly.

## Why This Happens
When you add new models to the Prisma schema, the Prisma client needs to be regenerated to include TypeScript types and methods for those models. The dev server locks the Prisma client files, so you need to restart it to regenerate.

