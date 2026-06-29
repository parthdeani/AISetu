import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as crypto from 'crypto';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ default: 'STAFF' })
  role: 'SUPER_ADMIN' | 'WORKSPACE_OWNER' | 'MANAGER' | 'STAFF';

  @Column({ nullable: true })
  workspace_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('whatsapp_accounts')
export class WhatsAppAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  phone_number_id: string;

  @Column()
  waba_id: string;

  @Column()
  access_token: string;

  @Column()
  webhook_verify_token: string;

  @Column({ default: 'DISCONNECTED' })
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('chatbot_flows')
export class ChatbotFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'json' })
  definition: any;

  @Column({ default: false })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = crypto.randomUUID();
    }
  }

  @Column()
  workspaceId: string;

  @Column()
  product_code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', default: 0.0 })
  price: number;

  @Column({ default: 'pcs' })
  unit: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK';

  images?: ProductImage[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('product_images')
export class ProductImage {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = crypto.randomUUID();
    }
  }

  @Column()
  productId: string;

  @Column()
  image_url: string;

  @Column({ unique: true, nullable: true })
  qdrant_vector_id: string;

  @Column({ type: 'json', nullable: true })
  vector: number[];

  @Column({ default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  phone_number: string;

  @Column({ nullable: true })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  customerId: string;

  @Column({ default: 'BOT' })
  status: 'BOT' | 'HUMAN' | 'RESOLVED';

  @UpdateDateColumn({ type: 'timestamp' })
  last_message_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';

  @Column()
  message_type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'BUTTON_RESPONSE';

  @Column({ nullable: true })
  body: string;

  @Column({ nullable: true })
  media_url: string;

  @Column({ type: 'json', nullable: true })
  meta_payload: any;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('search_history')
export class SearchHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column()
  uploaded_image_url: string;

  @Column({ type: 'json' })
  search_results: any;

  @Column({ nullable: true })
  selectedProductId: string;

  @Column({ type: 'decimal', nullable: true })
  threshold_applied: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  plan_name: string;

  @Column()
  status: string;

  @Column({ type: 'timestamp' })
  current_period_start: Date;

  @Column({ type: 'timestamp' })
  current_period_end: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
