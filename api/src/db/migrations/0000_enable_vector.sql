-- Custom SQL migration: enable pgvector before any table uses the vector type (05 §9).
CREATE EXTENSION IF NOT EXISTS vector;
