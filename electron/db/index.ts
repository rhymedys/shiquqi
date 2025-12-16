import path from 'path';
import Database from 'better-sqlite3';
import { app } from 'electron';

// 数据库存放路径（用户数据目录）
const dbPath = path.join(app.getPath('userData'), 'app.db');
const db = new Database(dbPath);

export const invokeInitDB = () => {
  // 初始化表
  db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT
  )
`);
};
