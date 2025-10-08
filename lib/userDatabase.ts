import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  name?: string;
  role: 'admin' | 'user' | 'pilot';
  avatar?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'user' | 'pilot';
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

class UserDatabase {
  private static instance: UserDatabase;
  private db: Database.Database;

  private constructor() {
    // 在项目根目录创建数据库文件
    const dbPath = path.join(process.cwd(), 'users.db');
    this.db = new Database(dbPath);
    this.initTables();
    this.createDefaultAdmin();
  }

  public static getInstance(): UserDatabase {
    if (!UserDatabase.instance) {
      UserDatabase.instance = new UserDatabase();
    }
    return UserDatabase.instance;
  }

  private initTables(): void {
    // 创建用户表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'pilot')),
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // 创建会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
    `);
  }

  private createDefaultAdmin(): void {
    const existingAdmin = this.getUserByEmail('admin@drone.com');
    if (!existingAdmin) {
      this.createUser({
        username: 'admin',
        email: 'admin@drone.com',
        password: 'admin123',
        name: '系统管理员',
        role: 'admin'
      });
      console.log('✅ 默认管理员账户已创建: admin@drone.com / admin123');
    }
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    const { username, email, password, name, role = 'user' } = userData;

    // 检查用户名和邮箱是否已存在
    if (this.getUserByEmail(email)) {
      throw new Error('邮箱已被注册');
    }
    if (this.getUserByUsername(username)) {
      throw new Error('用户名已被使用');
    }

    // 生成用户ID和密码哈希
    const userId = this.generateId();
    const passwordHash = await bcrypt.hash(password, 12);

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(userId, username, email, passwordHash, name, role);

    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('用户创建失败');
    }

    return user;
  }

  public getUserById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
    const row = stmt.get(email) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public getUserByUsername(username: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    const row = stmt.get(username) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  public createSession(userId: string): UserSession {
    const sessionId = this.generateId();
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天过期

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(sessionId, userId, token, expiresAt.toISOString());

    return {
      id: sessionId,
      user_id: userId,
      token,
      expires_at: expiresAt,
      created_at: new Date()
    };
  }

  public getSessionByToken(token: string): { session: UserSession; user: User } | null {
    const stmt = this.db.prepare(`
      SELECT s.*, u.* 
      FROM user_sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
    `);
    
    const row = stmt.get(token) as any;
    if (!row) {
      return null;
    }

    return {
      session: {
        id: row.id,
        user_id: row.user_id,
        token: row.token,
        expires_at: new Date(row.expires_at),
        created_at: new Date(row.created_at)
      },
      user: this.mapRowToUser(row)
    };
  }

  public deleteSession(token: string): void {
    const stmt = this.db.prepare('DELETE FROM user_sessions WHERE token = ?');
    stmt.run(token);
  }

  public deleteExpiredSessions(): void {
    const stmt = this.db.prepare('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
    stmt.run();
  }

  public getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToUser(row));
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const allowedFields = ['name', 'role', 'avatar', 'is_active'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      return this.getUserById(id);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => (updates as any)[field]);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getUserById(id);
  }

  public async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = this.getUserById(userId);
    if (!user) {
      return false;
    }

    const isValidOldPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidOldPassword) {
      return false;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const stmt = this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    stmt.run(newPasswordHash, userId);
    return true;
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      role: row.role,
      avatar: row.avatar,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_active: Boolean(row.is_active)
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public close(): void {
    this.db.close();
  }
}

export const userDatabase = UserDatabase.getInstance();