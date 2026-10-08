// ============================================================
// QUESTION SELECTOR - Weighted selection algorithm
// ============================================================

class QuestionSelector {
    constructor(progressTracker) {
        this.progressTracker = progressTracker;
        this.allQuestions = [];
        this.selectedQuestions = [];
    }

    /**
     * Load all questions and progress
     */
    async initialize(questions) {
        this.allQuestions = questions;
        if (this.progressTracker && !this.progressTracker.loaded) {
            await this.progressTracker.loadProgress();
        }
        console.log(`📚 Loaded ${this.allQuestions.length} questions for selection`);
    }

    /**
     * Select questions using weighted priority
     */
    selectQuestions(count, subject = null) {
        // Filter by subject if specified
        let available = subject && subject !== 'all' 
            ? this.allQuestions.filter(q => q.subject === subject)
            : this.allQuestions;

        if (available.length === 0) {
            console.warn('⚠️ No questions available for this subject');
            return [];
        }

        // Calculate priority for each question
        const prioritized = available.map(q => ({
            ...q,
            priority: this.calculatePriority(q.id)
        }));

        // Sort by priority (highest first)
        prioritized.sort((a, b) => b.priority - a.priority);

        // Select top N questions
        this.selectedQuestions = prioritized.slice(0, Math.min(count, prioritized.length));

        console.log(`✅ Selected ${this.selectedQuestions.length} questions`);
        return this.selectedQuestions;
    }

    /**
     * Calculate priority weight for a question
     */
    calculatePriority(questionId) {
        let priority = 0;
        const progress = this.progressTracker ? this.progressTracker.getQuestionProgress(questionId) : null;

        // Get total attempted
        const totalAttempted = this.progressTracker ? this.progressTracker.getTotalAttempted() : 0;
        const totalQuestions = this.allQuestions.length;
        const percentageSeen = totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0;

        // ===== TIER 1: Never attempted =====
        if (!progress) {
            // Highest priority for never seen questions
            priority += 50;
            console.log(`Question ${questionId}: Never seen → +50`);
            return priority;
        }

        // ===== TIER 2: Attempted but wrong =====
        const successRate = progress.attempted > 0 ? progress.correct / progress.attempted : 0;
        if (successRate < 0.5) {
            priority += 30;
            console.log(`Question ${questionId}: Low success rate (${Math.round(successRate * 100)}%) → +30`);
        } else if (successRate < 0.7) {
            priority += 15;
            console.log(`Question ${questionId}: Medium success rate (${Math.round(successRate * 100)}%) → +15`);
        }

        // ===== TIER 3: Not seen recently =====
        if (progress.lastAttempt) {
            const daysSince = (Date.now() - new Date(progress.lastAttempt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 30) {
                priority += 50;
                console.log(`Question ${questionId}: Not seen for ${Math.round(daysSince)} days → +50`);
            } else if (daysSince > 14) {
                priority += 30;
                console.log(`Question ${questionId}: Not seen for ${Math.round(daysSince)} days → +30`);
            } else if (daysSince > 7) {
                priority += 20;
                console.log(`Question ${questionId}: Not seen for ${Math.round(daysSince)} days → +20`);
            }
        }

        // ===== TIER 4: 90% rule - repeat if seen most questions =====
        if (percentageSeen >= 90) {
            priority += 5;
            console.log(`Question ${questionId}: 90% rule activated → +5`);
        }

        return priority;
    }

    /**
     * Get selected questions
     */
    getSelectedQuestions() {
        return this.selectedQuestions;
    }

    /**
     * Get statistics about the selection
     */
    getSelectionStats() {
        const total = this.allQuestions.length;
        const attempted = this.progressTracker ? this.progressTracker.getTotalAttempted() : 0;
        const percentage = total > 0 ? (attempted / total) * 100 : 0;

        return {
            totalQuestions: total,
            attemptedQuestions: attempted,
            percentageSeen: Math.round(percentage),
            selectedCount: this.selectedQuestions.length,
            isRepeating: percentage >= 90
        };
    }
}