import { storage } from "./storage";
import { seedGiftProducts } from "./seed-data";
import { pool } from "./db";

export async function seedDatabase() {
  console.log("Ensuring database tables exist...");
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar PRIMARY KEY,
        sess jsonb NOT NULL,
        expire timestamp NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar UNIQUE,
        first_name varchar,
        last_name varchar,
        profile_image_url varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS gift_products (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text NOT NULL,
        category text NOT NULL,
        price_min integer NOT NULL,
        price_max integer NOT NULL,
        interests text[] NOT NULL,
        occasions text[] NOT NULL,
        age_group text,
        relationship text[],
        personality text[],
        affiliate_link text,
        image_url text,
        tags text[],
        amazon_product_id text,
        amazon_url text,
        amazon_price text,
        amazon_rating text,
        amazon_num_ratings text,
        is_prime text,
        is_best_seller text,
        is_amazon_choice text
      );
      CREATE TABLE IF NOT EXISTS gift_recommendations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id varchar NOT NULL,
        recipient_name text,
        recipient_age integer,
        relationship text,
        interests text[],
        personality text,
        budget text,
        occasion text,
        product_id varchar REFERENCES gift_products(id),
        ai_reasoning text,
        personalized_message text,
        relevance_score integer,
        created_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS recipient_profiles (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar REFERENCES users(id) NOT NULL,
        name text NOT NULL,
        gender text,
        age integer,
        interests text[] NOT NULL,
        personality text,
        relationship text,
        favorite_occasions text[],
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar REFERENCES users(id),
        session_id varchar,
        recommendation_id varchar REFERENCES gift_recommendations(id),
        product_id varchar REFERENCES gift_products(id),
        notes text,
        reminder timestamp,
        created_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS shared_wishlists (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        share_token varchar UNIQUE NOT NULL,
        user_id varchar REFERENCES users(id),
        session_id varchar,
        title text,
        description text,
        created_at timestamp DEFAULT now(),
        view_count integer DEFAULT 0
      );
    `);
    console.log("Database tables verified/created successfully.");
  } catch (err) {
    console.error("Error creating database tables:", err);
  }

  console.log("Seeding gift products database...");
  
  let seededCount = 0;
  let skippedCount = 0;
  
  const existingProducts = await storage.getAllGifts();
  
  for (const product of seedGiftProducts) {
    try {
      const exists = existingProducts.some(p => p.name === product.name && p.category === product.category);
      
      if (!exists) {
        await storage.createGiftProduct(product);
        seededCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`Failed to seed product: ${product.name}`, error);
    }
  }
  
  console.log(`Successfully seeded ${seededCount} gift products (${skippedCount} already existed)`);
  return seededCount;
}

