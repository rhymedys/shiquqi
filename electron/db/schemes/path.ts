import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import dbProxy from '..';

export const path = sqliteTable('path', {
  id: integer('id').primaryKey(),
  userId: integer('userId').notNull(),
  name: text('path'),
});

export const invokeInsertPath = (v: any) => {
  return dbProxy.insert(path).values(v);
};
