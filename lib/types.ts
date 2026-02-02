export type Role = "student" | "parent" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  class_level: string;
  term: string;
  description: string | null;
  is_custom: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  title: string;
  learning_objectives: string | null;
  estimated_study_time_minutes: number;
  difficulty_level: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  difficulty_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
  time_spent_seconds: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  topic_id: string;
  score_percent: number;
  answers_json: { questionId: string; selectedIndex: number }[] | null;
  created_at: string;
}
