import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { PrismaClient } from '@prisma/client'

const app = new Hono()
const prisma = new PrismaClient()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 4444
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})