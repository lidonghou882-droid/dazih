export interface Article {
  id: string;
  title: string;
  author: string;
  content: string;
  category: string;
  difficulty: '简单' | '困难';
}

export interface TypingStats {
  startTime: number | null;
  endTime: number | null;
  correctChars: number;
  errorChars: number;
  totalChars: number;
  cpm: number;
  accuracy: number;
}

export interface TypingRecord {
  id: string;
  articleTitle: string;
  articleAuthor: string;
  timeSpent: number; // in seconds
  cpm: number;
  accuracy: number;
  timestamp: number;
}
