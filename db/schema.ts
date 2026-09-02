import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  emailLookup: text('email_lookup').notNull().unique(),
  emailCipher: text('email_cipher').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  grade: integer('grade'),
  classNumber: integer('class_number'),
  seatNumber: integer('seat_number'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  grade: integer('grade').notNull(),
  classNumber: integer('class_number').notNull(),
  teacherId: text('teacher_id'),
  createdAt: text('created_at').notNull(),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  assignmentId: text('assignment_id'),
  grade: integer('grade').notNull(),
  unitSummaryCipher: text('unit_summary_cipher').notNull(),
  attemptsCipher: text('attempts_cipher').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  firstCorrect: integer('first_correct').notNull(),
  hintsUsed: integer('hints_used').notNull(),
  createdAt: text('created_at').notNull(),
  deleteAfter: text('delete_after').notNull(),
});
