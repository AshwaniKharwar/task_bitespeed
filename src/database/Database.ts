import sqlite3 from 'sqlite3';
import { Contact, CreateContactData } from '../models/Contact';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './contacts.db') {
    // Vercel specific path adjustment
    const finalDbPath = process.env.VERCEL
      ? path.join('/tmp', 'contacts.db')
      : dbPath;

    // Ensure the directory exists (for local development)
    const dir = path.dirname(finalDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(finalDbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phoneNumber TEXT,
        email TEXT,
        linkedId INTEGER,
        linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        deletedAt DATETIME,
        FOREIGN KEY (linkedId) REFERENCES contacts (id)
      )
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Error creating contacts table:', err);
      } else {
        console.log('Contacts table initialized successfully');
      }
    });
  }

  async findContactsByEmailOrPhone(email?: string, phoneNumber?: string): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM contacts WHERE deletedAt IS NULL';
      const params: any[] = [];

      if (email && phoneNumber) {
        query += ' AND (email = ? OR phoneNumber = ?)';
        params.push(email, phoneNumber);
      } else if (email) {
        query += ' AND email = ?';
        params.push(email);
      } else if (phoneNumber) {
        query += ' AND phoneNumber = ?';
        params.push(phoneNumber);
      } else {
        resolve([]);
        return;
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const contacts = rows.map(row => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            deletedAt: row.deletedAt ? new Date(row.deletedAt) : null
          }));
          resolve(contacts);
        }
      });
    });
  }

  async findContactById(id: number): Promise<Contact | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM contacts WHERE id = ? AND deletedAt IS NULL',
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve({
              ...row,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
              deletedAt: row.deletedAt ? new Date(row.deletedAt) : null
            });
          }
        }
      );
    });
  }

  async findAllLinkedContacts(primaryId: number): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM contacts 
        WHERE deletedAt IS NULL 
        AND (id = ? OR linkedId = ?)
        ORDER BY createdAt ASC
      `;
      
      this.db.all(query, [primaryId, primaryId], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const contacts = rows.map(row => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            deletedAt: row.deletedAt ? new Date(row.deletedAt) : null
          }));
          resolve(contacts);
        }
      });
    });
  }

  async createContact(data: CreateContactData): Promise<Contact> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(
        query,
        [data.phoneNumber, data.email, data.linkedId, data.linkPrecedence],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Fetch the created contact
            const createdId = this.lastID;
            resolve({
              id: createdId,
              phoneNumber: data.phoneNumber || null,
              email: data.email || null,
              linkedId: data.linkedId || null,
              linkPrecedence: data.linkPrecedence,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null
            });
          }
        }
      );
    });
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<void> {
    return new Promise((resolve, reject) => {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => (updates as any)[key]);
      
      const query = `
        UPDATE contacts 
        SET ${setClause}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      this.db.run(query, [...values, id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllContacts(limit: number = 50, offset: number = 0): Promise<{ contacts: Contact[], total: number }> {
    return new Promise((resolve, reject) => {
      // Get total count first
      this.db.get(
        'SELECT COUNT(*) as total FROM contacts WHERE deletedAt IS NULL',
        [],
        (err, countRow: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Get paginated contacts
          const query = `
            SELECT * FROM contacts 
            WHERE deletedAt IS NULL 
            ORDER BY createdAt DESC 
            LIMIT ? OFFSET ?
          `;
          
          this.db.all(query, [limit, offset], (err, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const contacts = rows.map(row => ({
                ...row,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                deletedAt: row.deletedAt ? new Date(row.deletedAt) : null
              }));
              
              resolve({
                contacts,
                total: countRow.total
              });
            }
          });
        }
      );
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
