Veersa Care: High-Scale Digital Health Backend

This repository contains the full backend implementation plan and structure for the Veersa Care platform, a modern digital health application designed to handle patient bookings, doctor scheduling, integrated RAG/OCR document processing, and real-time appointment tracking.

🚀 Technology Stack

Category

Component

Purpose

Runtime

Node.js 20

Asynchronous, event-driven I/O for high throughput.

Framework

NestJS

Robust, modular, TypeScript-based framework for API and Workers.

Database

PostgreSQL 16

Primary data store, leveraging advanced features.

Geospatial

PostGIS

Enables complex "Search Doctors Near Me" queries using spatial indexes.

Vector DB

pgvector

Stores document embeddings for efficient Semantic Search (RAG).

ORM

Prisma

Type-safe database access, schema management, and migrations.

Asynchronous Ops

BullMQ

Reliable Redis-backed queue system for background jobs.

Cache/Queue

Redis 7

High-speed cache for availability, TTL slot holds, and BullMQ backend.

Authentication

JWT

Standard token-based authentication (OTP flow) with short-lived access tokens.

File Storage

MinIO (S3-compatible)

Local object storage for documents, prescriptions, and media uploads.

🏗️ Architecture and Repository Layout

The project uses a monorepo structure to cleanly separate the HTTP API from the asynchronous worker processes and shared logic.

veersa-care/
├── apps/
│   ├── api/          # 🎯 NestJS HTTP API (User interaction, Booking, Auth)
│   └── workers/      # ⚙️ BullMQ Consumers (OCR, RAG Indexing, Notifications, Reminders)
├── packages/
│   ├── common/       # 🧩 Shared logic, DTOs, Guards, Types, Utils
│   └── prisma/       # 💾 Prisma Schema, Migrations, and Seeding logic
├── infra/            # 🐳 Local Development infrastructure (Docker Compose)
└── docs/             # 📝 System documentation


1. Core NestJS Modules (apps/api/src/)

The API is structured around functional domains, promoting separation of concerns:

Module

Key Functionality

Auth / Users

OTP generation, JWT handling, user/patient profile management.

Doctors / Clinics

CRUD for providers and their locations (including PostGIS integration).

Schedule / Availability

Defining work blocks and materializing real-time, cacheable appointment slots.

Holds / Appointments

Transactional booking, slot hold TTL logic, rescheduling, and cancellation.

Documents / OCR

File upload (MinIO) and enqueueing long-running OCR jobs.

RAG

Doctor-facing API for querying patient documents via semantic search (proxies to worker).

Notifications

Enqueueing scheduled messages (Email, SMS, Push) via BullMQ.

Waittime

Real-time ETA estimation for appointments using Exponential Moving Average (EMA).

2. Asynchronous Workers (apps/workers/src/)

All long-running, CPU-intensive, or scheduled tasks are handled by dedicated BullMQ workers to prevent API saturation.

ocr.worker.ts: Performs document parsing via Google Vision API and extracts structured data.

rag_index.worker.ts: Chunks structured documents, generates embeddings (using hosted API), and inserts vectors into rag_chunk table (pgvector).

notifications.worker.ts: Dispatches scheduled messages (Twilio, SendGrid, FCM).

reminders.worker.ts: Manages recurring medication and appointment reminders.

waittime.worker.ts: Periodically recalculates and updates appointment wait times using EMA.

3. Data Flow Highlights

A. Geospatial Search

Doctors and Clinics are stored with a geography(Point, 4326) column. Searching uses PostGIS functions (ST_Distance) and a GIST index to quickly locate providers near a patient's coordinates, ordered by distance and availability (cached).

B. High-Concurrency Booking

The booking flow is protected by a multi-step transaction:

Slot Hold: A slot_hold is inserted with a short TTL, mirrored in Redis for fast expiration checks.

Confirmation (Transaction): Before confirming, a transactional check is performed using a unique index on (doctor_id, start_ts) in the appointments table. This prevents race conditions and ensures atomic slot reservation.

Post-Commit: An event (appointment.booked) is published, triggering notification workers.

C. Document Intelligence (OCR & RAG)

Patient Upload: A patient uploads a document (multipart/form-data) to the /documents API, which stores it in MinIO.

OCR Pipeline: The API enqueues an ocr job with the file URL. The ocr.worker uses Google Vision to process the document, normalize drugs/sections, and update the documents table with text and structured_json.

RAG Indexing: Upon successful OCR completion, the rag-index.worker is triggered. It chunks the text, uses a hosted API to generate embeddings, and stores the resulting vectors in the rag_chunk table (pgvector).

Doctor Query: A doctor's question hits the /rag endpoint, which enqueues a rag-query job. The worker performs a pgvector semantic search across the chunks, reranks results by recency, and streams the citation-backed answer back to the doctor.