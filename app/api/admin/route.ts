import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr-pooler.us-east-2.aws.neon.tech/documents?sslmode=require"
});

// Create table if it doesn't exist
async function createTable() {
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hero_content'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Create a new table only if it doesn't exist
      await client.query(`
        CREATE TABLE hero_content (
          id SERIAL PRIMARY KEY,
          heading TEXT NOT NULL,
          description TEXT NOT NULL,
          readymade_system_message TEXT NOT NULL,
          build_system_message TEXT NOT NULL,
          review_system_message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table hero_content created successfully');
    } else {
      console.log('Table hero_content already exists');
    }
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize the table
let tableInitialized = false;
async function initializeTable() {
  if (!tableInitialized) {
    await createTable();
    tableInitialized = true;
  }
}

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // Ensure table exists
      await initializeTable();
      
      const result = await client.query('SELECT * FROM hero_content ORDER BY created_at DESC LIMIT 1');
      
      if (result.rows.length === 0) {
        console.log('No hero content found in database');
        return NextResponse.json(null);
      }
      
      console.log('Successfully retrieved hero content:', result.rows[0]);
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error('Error in GET query:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching hero content:', error);
    return NextResponse.json({ error: 'Failed to fetch hero content' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      heading, 
      description, 
      readymadeSystemMessage,
      buildSystemMessage,
      reviewSystemMessage 
    } = await request.json();
    
    if (!heading || !description || !readymadeSystemMessage || !buildSystemMessage || !reviewSystemMessage) {
      console.error('Missing required fields in POST request');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Ensure table exists
      await initializeTable();
      
      // First, clear any existing content
      await client.query('DELETE FROM hero_content');
      
      // Insert new content
      const result = await client.query(
        'INSERT INTO hero_content (heading, description, readymade_system_message, build_system_message, review_system_message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [heading, description, readymadeSystemMessage, buildSystemMessage, reviewSystemMessage]
      );
      
      console.log('Successfully stored new hero content:', result.rows[0]);
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error('Error in POST query:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating hero content:', error);
    return NextResponse.json(
      { error: 'Failed to update hero content' },
      { status: 500 }
    );
  }
} 