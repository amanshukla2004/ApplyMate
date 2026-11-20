import { indexedDBClient, STORES } from './storage/indexedDB';
import { SavedAnswer, AnswerCategory } from '../types/profile';

export class AnswerService {
  async getAnswers(): Promise<SavedAnswer[]> {
    return indexedDBClient.getAll<SavedAnswer>(STORES.ANSWERS);
  }

  async getAnswersByCategory(category: AnswerCategory): Promise<SavedAnswer[]> {
    const answers = await this.getAnswers();
    return answers.filter((a) => a.category === category);
  }

  async saveAnswer(answer: SavedAnswer): Promise<SavedAnswer> {
    const updated: SavedAnswer = {
      ...answer,
      updatedAt: new Date().toISOString(),
    };
    return indexedDBClient.put(STORES.ANSWERS, updated);
  }

  async deleteAnswer(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.ANSWERS, id);
  }

  async searchAnswers(query: string, categoryFilter?: AnswerCategory): Promise<SavedAnswer[]> {
    const answers = await this.getAnswers();
    const q = query.toLowerCase().trim();

    return answers.filter((a) => {
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.question.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q) ||
        a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }
}

export const answerService = new AnswerService();
