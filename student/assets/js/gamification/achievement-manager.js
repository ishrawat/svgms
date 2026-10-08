// ============================================================
// ACHIEVEMENT MANAGER - Track and unlock achievements
// ============================================================

class AchievementManager {
    constructor() {
        this.definitions = this.getDefinitions();
        this.studentAchievements = [];
        this.loaded = false;
    }

    /**
     * All achievement definitions
     */
    getDefinitions() {
        return {
            // ===== PARTICIPATION =====
            first_quiz: {
                id: 'first_quiz',
                name: 'First Steps',
                icon: '🎯',
                description: 'Complete your first quiz',
                points: 10,
                check: (data) => data.totalQuizzes === 1
            },
            quiz_warrior: {
                id: 'quiz_warrior',
                name: 'Quiz Warrior',
                icon: '⚔️',
                description: 'Complete 10 quizzes',
                points: 50,
                check: (data) => data.totalQuizzes >= 10
            },
            quiz_master: {
                id: 'quiz_master',
                name: 'Quiz Master',
                icon: '🏆',
                description: 'Complete 50 quizzes',
                points: 200,
                check: (data) => data.totalQuizzes >= 50
            },

            // ===== PERFORMANCE =====
            perfect_score: {
                id: 'perfect_score',
                name: 'Perfect Score',
                icon: '💯',
                description: 'Score 100% on any quiz',
                points: 50,
                check: (data) => data.percentage === 100 && data.totalQuestions >= 5
            },
            speed_demon: {
                id: 'speed_demon',
                name: 'Speed Demon',
                icon: '⚡',
                description: 'Complete a quiz in under 30 seconds',
                points: 30,
                check: (data) => data.timeTaken <= 30 && data.totalQuestions >= 5
            },
            zero_wrong: {
                id: 'zero_wrong',
                name: 'Zero Wrong',
                icon: '🎯',
                description: 'Complete a quiz with zero wrong answers',
                points: 25,
                check: (data) => data.wrong === 0 && data.totalQuestions >= 5
            },

            // ===== STREAKS =====
            streak_7: {
                id: 'streak_7',
                name: '7-Day Streak',
                icon: '🔥',
                description: 'Maintain a 7-day streak',
                points: 50,
                check: (data) => data.streak >= 7
            },
            streak_30: {
                id: 'streak_30',
                name: '30-Day Streak',
                icon: '🌟',
                description: 'Maintain a 30-day streak',
                points: 100,
                check: (data) => data.streak >= 30
            },
            streak_100: {
                id: 'streak_100',
                name: '100-Day Streak',
                icon: '💎',
                description: 'Maintain a 100-day streak',
                points: 200,
                check: (data) => data.streak >= 100
            },

            // ===== SUBJECT EXPERTS =====
            physics_pro: {
                id: 'physics_pro',
                name: 'Physics Pro',
                icon: '⚛️',
                description: 'Score 80%+ on 10 Physics quizzes',
                points: 100,
                check: (data) => this.checkSubjectExpert(data, 'physics', 10, 80)
            },
            chemistry_whiz: {
                id: 'chemistry_whiz',
                name: 'Chemistry Whiz',
                icon: '🧪',
                description: 'Score 80%+ on 10 Chemistry quizzes',
                points: 100,
                check: (data) => this.checkSubjectExpert(data, 'chemistry', 10, 80)
            },
            math_genius: {
                id: 'math_genius',
                name: 'Math Genius',
                icon: '📐',
                description: 'Score 80%+ on 10 Math quizzes',
                points: 100,
                check: (data) => this.checkSubjectExpert(data, 'math', 10, 80)
            },
            biology_expert: {
                id: 'biology_expert',
                name: 'Biology Expert',
                icon: '🧬',
                description: 'Score 80%+ on 10 Biology quizzes',
                points: 100,
                check: (data) => this.checkSubjectExpert(data, 'biology', 10, 80)
            },

            // ===== SPECIAL =====
            student_of_week: {
                id: 'student_of_week',
                name: 'Student of the Week',
                icon: '🏆',
                description: 'Become Student of the Week',
                points: 100,
                check: (data) => data.isStudentOfWeek || false
            }
        };
    }

    /**
     * Check subject expert achievement
     */
    checkSubjectExpert(data, subject, minQuizzes, minScore) {
        if (!data.subjectStats) return false;
        const stats = data.subjectStats[subject];
        if (!stats) return false;
        return stats.count >= minQuizzes && stats.avgScore >= minScore;
    }

    /**
     * Load student's unlocked achievements
     */
    async loadStudentAchievements(uid) {
        try {
            const doc = await db.collection('students').doc(uid).get();
            if (doc.exists) {
                this.studentAchievements = doc.data().achievements || [];
                this.loaded = true;
                return this.studentAchievements;
            }
            this.studentAchievements = [];
            this.loaded = true;
            return [];
        } catch (error) {
            console.error('❌ Error loading achievements:', error);
            return [];
        }
    }

    /**
     * Check all achievements after quiz
     */
    async checkAchievements(uid, quizData) {
        try {
            if (!this.loaded) {
                await this.loadStudentAchievements(uid);
            }

            const unlocked = new Set(this.studentAchievements);
            const newAchievements = [];

            // Get student data for checks
            const studentDoc = await db.collection('students').doc(uid).get();
            const studentData = studentDoc.exists ? studentDoc.data() : {};

            // Prepare data for achievement checks
            const checkData = {
                totalQuizzes: await this.getTotalQuizzes(uid),
                percentage: quizData.percentage || 0,
                totalQuestions: quizData.total || 0,
                wrong: quizData.wrong || 0,
                timeTaken: quizData.timeTaken || 0,
                streak: studentData.streak || 0,
                isStudentOfWeek: quizData.isStudentOfWeek || false,
                subjectStats: await this.getSubjectStats(uid)
            };

            // Check each achievement
            for (const [id, def] of Object.entries(this.definitions)) {
                if (unlocked.has(id)) continue;
                
                try {
                    if (def.check(checkData)) {
                        newAchievements.push(id);
                        unlocked.add(id);
                    }
                } catch (err) {
                    console.warn(`⚠️ Error checking achievement ${id}:`, err);
                }
            }

            // Unlock new achievements
            if (newAchievements.length > 0) {
                await this.unlockAchievements(uid, newAchievements);
            }

            return newAchievements;
        } catch (error) {
            console.error('❌ Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Unlock achievements
     */
    async unlockAchievements(uid, achievementIds) {
        try {
            // Update student document
            await db.collection('students').doc(uid).update({
                achievements: firebase.firestore.FieldValue.arrayUnion(...achievementIds)
            });

            // Award bonus points
            let totalBonus = 0;
            const achievementNames = [];
            
            for (const id of achievementIds) {
                const def = this.definitions[id];
                if (def) {
                    totalBonus += def.points || 0;
                    achievementNames.push(def.name);
                    
                    // Show notification
                    notifications.showAchievement(def.name, def.icon);
                }
            }

            // Add bonus points
            if (totalBonus > 0) {
                await db.collection('students').doc(uid).update({
                    totalPoints: firebase.firestore.FieldValue.increment(totalBonus)
                });
            }

            console.log(`🏅 Achievements unlocked: ${achievementNames.join(', ')} (+${totalBonus} points)`);
            return achievementNames;
        } catch (error) {
            console.error('❌ Error unlocking achievements:', error);
            return [];
        }
    }

    /**
     * Get total quizzes taken
     */
    async getTotalQuizzes(uid) {
        try {
            const snapshot = await db.collection('quiz_scores')
                .where('studentId', '==', uid)
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('❌ Error getting total quizzes:', error);
            return 0;
        }
    }

    /**
     * Get subject stats
     */
    async getSubjectStats(uid) {
        try {
            const snapshot = await db.collection('quiz_scores')
                .where('studentId', '==', uid)
                .get();

            const stats = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const subject = data.subject || 'general';
                if (!stats[subject]) {
                    stats[subject] = { count: 0, totalScore: 0, avgScore: 0 };
                }
                stats[subject].count += 1;
                stats[subject].totalScore += data.percentage || 0;
                stats[subject].avgScore = Math.round(stats[subject].totalScore / stats[subject].count);
            });

            return stats;
        } catch (error) {
            console.error('❌ Error getting subject stats:', error);
            return {};
        }
    }

    /**
     * Get all achievements with unlock status
     */
    async getAchievementsWithStatus(uid) {
        if (!this.loaded) {
            await this.loadStudentAchievements(uid);
        }

        const unlocked = new Set(this.studentAchievements);
        const result = [];

        for (const [id, def] of Object.entries(this.definitions)) {
            result.push({
                ...def,
                unlocked: unlocked.has(id)
            });
        }

        return result;
    }

    /**
     * Get unlocked achievement count
     */
    getUnlockedCount() {
        return this.studentAchievements.length;
    }

    /**
     * Get total achievement count
     */
    getTotalCount() {
        return Object.keys(this.definitions).length;
    }

    /**
     * Get achievement progress percentage
     */
    getProgressPercentage() {
        return Math.round((this.getUnlockedCount() / this.getTotalCount()) * 100);
    }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================
let achievementManager = null;

function initAchievementManager(uid) {
    achievementManager = new AchievementManager();
    return achievementManager;
}