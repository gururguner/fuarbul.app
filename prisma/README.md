# Prisma

This directory contains the Prisma database foundation for fuarbul.

- `schema.prisma` defines the PostgreSQL schema.
- `seed.ts` upserts initial categories and subcategories.

The current UI still uses mock data. Prisma commands require `DATABASE_URL` only
when connecting to a real PostgreSQL database such as Supabase.
