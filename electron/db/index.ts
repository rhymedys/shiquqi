import path from 'path';
import Database from 'better-sqlite3';
import { app } from 'electron';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// 数据库存放路径（用户数据目录）
const dbPath = path.join(app.getPath('userData'), 'app.db');
const sqlite = new Database(dbPath);
// const sqlite = new Database('sqlite.db');
export const dbProxy = drizzle(sqlite);

// console.log('dbPath', dbPath);
// export const invokeInitDB = () => {
//   // 初始化表
//   db.exec(`
//   CREATE TABLE IF NOT EXISTS notes (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     title TEXT NOT NULL,
//     content TEXT
//   )
// `);

//   db.exec(`
//   CREATE TABLE IF NOT EXISTS cookies (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     user TEXT NOT NULL,
//     cookieStr TEXT
//   )
// `);
// };

// db.selectDistinct
export default dbProxy;
