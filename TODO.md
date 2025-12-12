# Fix PrismaClient Initialization Error

## Tasks
- [x] Update src/lib/auth.ts to use singleton PrismaClient from prisma.ts
- [ ] Update src/lib/auth-service.ts to use singleton PrismaClient from prisma.ts
- [ ] Test the application to ensure the error is resolved

## Details
The error occurs because auth.ts and auth-service.ts are creating new PrismaClient instances without proper options. The solution is to use the existing singleton from prisma.ts.
