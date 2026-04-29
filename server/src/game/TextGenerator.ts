import type { Difficulty } from '@typecomp/shared';
import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS } from './wordLists.js';

export class TextGenerator {
  private wordLists: Record<Difficulty, string[]> = {
    easy: EASY_WORDS,
    medium: MEDIUM_WORDS,
    hard: HARD_WORDS,
  };

  generate(wordCount: number, difficulty: Difficulty): string {
    const list = this.wordLists[difficulty];
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const index = Math.floor(Math.random() * list.length);
      words.push(list[index]);
    }
    return words.join(' ');
  }
}
