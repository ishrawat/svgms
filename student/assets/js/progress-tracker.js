// ============================================================
// PROGRESS TRACKER - Tracks student question progress
// ============================================================

class ProgressTracker {
    constructor(uid) {
        this.uid = uid;
        this.progress = null;
        this.loaded = false;
    }

    /**
     * Load student progress from Firestore
     */
    async loadProgress() {
        if (this.loaded) return this.progress;

        try {
            const docRef = db.collection('students').doc(this.uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                this.progress = data.questionProgress || {};
                this.loaded = true;
                console.log(`✅ Loaded progress for ${this.uid}: ${Object.keys(this.progress).length} questions tracked`);
                return this.progress;
            } else {
                this.progress = {};
                this.loaded = true;
                return {};
            }
        } catch (error) {
            console.error('❌ Error loading progress:', error);
            return {};
        }
    }

    /**
     * Get progress for a specific question
     */
    getQuestionProgress(questionId) {
        if (!this.progress) return null;
        return this.progress[questionId] || null;
    }

    /**
     * Update progress for a question
     */
    async updateProgress(questionId, isCorrect) {
        try {
            // Load if not loaded
            if (!this.loaded) {
                await this.loadProgress();
            }

            // Initialize if not exists
            if (!this.progress[questionId]) {
                this.progress[questionId] = {
                    attempted: 0,
                    correct: 0,
                    wrong: 0,
                    lastAttempt: null
                };
            }

            // Update stats
            const p = this.progress[questionId];
            p.attempted += 1;
            if (isCorrect) {
                p.correct += 1;
            } else {
                p.wrong += 1;
            }
            p.lastAttempt = new Date().toISOString();

            // Save to Firestore
            await this.saveProgress();

            return this.progress[questionId];
        } catch (error) {
            console.error('❌ Error updating progress:', error);
            throw error;
        }
    }

    /**
     * Save progress to Firestore
     */
    async saveProgress() {
        try {
            const docRef = db.collection('students').doc(this.uid);
            await docRef.update({
                questionProgress: this.progress,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Progress saved to Firestore');
        } catch (error) {
            console.error('❌ Error saving progress:', error);
            throw error;
        }
    }

    /**
     * Get all questions with their progress
     */
    getAllProgress() {
        return this.progress || {};
    }

    /**
     * Get questions never attempted
     */
    getUnattemptedQuestions(questionIds) {
        const attempted = Object.keys(this.progress);
        return questionIds.filter(id => !attempted.includes(id.toString()));
    }

    /**
     * Get questions attempted but wrong (need practice)
     */
    getWeakQuestions(threshold = 0.5) {
        const weak = [];
        for (const [id, p] of Object.entries(this.progress)) {
            const successRate = p.correct / p.attempted;
            if (successRate < threshold) {
                weak.push({ id, ...p, successRate });
            }
        }
        // Sort by lowest success rate first
        weak.sort((a, b) => a.successRate - b.successRate);
        return weak;
    }

    /**
     * Get questions not seen in X days
     */
    getOldQuestions(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        const old = [];
        for (const [id, p] of Object.entries(this.progress)) {
            if (p.lastAttempt) {
                const lastDate = new Date(p.lastAttempt);
                if (lastDate < cutoff) {
                    old.push({ id, ...p, daysSince: Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)) });
                }
            }
        }
        // Sort by oldest first
        old.sort((a, b) => b.daysSince - a.daysSince);
        return old;
    }

    /**
     * Get total attempted questions
     */
    getTotalAttempted() {
        return Object.keys(this.progress).length;
    }

    /**
     * Get total questions with progress
     */
    getStats() {
        let totalAttempts = 0;
        let totalCorrect = 0;
        let totalWrong = 0;

        for (const p of Object.values(this.progress)) {
            totalAttempts += p.attempted;
            totalCorrect += p.correct;
            totalWrong += p.wrong;
        }

        return {
            totalAttempts,
            totalCorrect,
            totalWrong,
            totalQuestions: Object.keys(this.progress).length,
            accuracy: totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0
        };
    }

    /**
     * Clear progress (for testing)
     */
    async clearProgress() {
        this.progress = {};
        await this.saveProgress();
        console.log('🗑️ Progress cleared');
    }
}

// Create global instance (will be initialized with UID)
let progressTracker = null;

function initProgressTracker(uid) {
    progressTracker = new ProgressTracker(uid);
    return progressTracker;
}