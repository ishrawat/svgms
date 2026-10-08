// ============================================================
// STUDENT OF THE WEEK - Track weekly top performers
// ============================================================

class StudentOfWeek {
    constructor() {
        this.weekStart = this.getWeekStart();
        this.weekEnd = this.getWeekEnd();
        this.currentWinner = null;
        this.loaded = false;
    }

    /**
     * Get start of current week (Monday)
     */
    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    /**
     * Get end of current week (Sunday)
     */
    getWeekEnd() {
        const end = new Date(this.weekStart);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    }

    /**
     * Get weekly points for a student
     */
    async getWeeklyPoints(uid) {
        try {
            const snapshot = await db.collection('quiz_scores')
                .where('studentId', '==', uid)
                .where('attemptedAt', '>=', this.weekStart)
                .where('attemptedAt', '<=', this.weekEnd)
                .get();

            let totalPoints = 0;
            snapshot.forEach(doc => {
                totalPoints += doc.data().score || 0;
            });

            return totalPoints;
        } catch (error) {
            console.error('❌ Error getting weekly points:', error);
            return 0;
        }
    }

    /**
     * Get all students sorted by weekly points
     */
    async getWeeklyLeaderboard(limit = 10) {
        try {
            const snapshot = await db.collection('students').get();
            const leaderboard = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const uid = doc.id;
                const points = await this.getWeeklyPoints(uid);
                leaderboard.push({
                    uid: uid,
                    name: data.name || 'Explorer',
                    points: points,
                    streak: data.streak || 0,
                    totalPoints: data.totalPoints || 0
                });
            }

            // Sort by points (highest first)
            leaderboard.sort((a, b) => b.points - a.points);

            return leaderboard.slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting weekly leaderboard:', error);
            return [];
        }
    }

    /**
     * Get current week's winner
     */
    async getCurrentWinner() {
        if (this.loaded && this.currentWinner) {
            return this.currentWinner;
        }

        try {
            const leaderboard = await this.getWeeklyLeaderboard(1);
            
            if (leaderboard.length > 0 && leaderboard[0].points > 0) {
                this.currentWinner = leaderboard[0];
                this.loaded = true;
                return this.currentWinner;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting winner:', error);
            return null;
        }
    }

    /**
     * Check if current user is Student of the Week
     */
    async isStudentOfWeek(uid) {
        const winner = await this.getCurrentWinner();
        return winner ? winner.uid === uid : false;
    }

    /**
     * Award Student of the Week badge and bonus
     */
    async awardStudentOfWeek(uid) {
        try {
            // Award bonus points
            await db.collection('students').doc(uid).update({
                totalPoints: firebase.firestore.FieldValue.increment(100)
            });

            // Add achievement
            const achievements = await this.getStudentAchievements(uid);
            if (!achievements.includes('student_of_week')) {
                await db.collection('students').doc(uid).update({
                    achievements: firebase.firestore.FieldValue.arrayUnion('student_of_week')
                });
            }

            console.log(`🏆 Student of the Week awarded to: ${uid}`);
            return true;
        } catch (error) {
            console.error('❌ Error awarding Student of the Week:', error);
            return false;
        }
    }

    /**
     * Get student's achievements
     */
    async getStudentAchievements(uid) {
        try {
            const doc = await db.collection('students').doc(uid).get();
            if (doc.exists) {
                return doc.data().achievements || [];
            }
            return [];
        } catch (error) {
            console.error('❌ Error getting achievements:', error);
            return [];
        }
    }

    /**
     * Auto-check and award Student of the Week (run weekly)
     */
    async autoCheckStudentOfWeek() {
        try {
            const winner = await this.getCurrentWinner();
            
            if (winner && winner.points > 0) {
                // Check if already awarded this week
                const awardedDoc = await db.collection('system_flags')
                    .doc('student_of_week')
                    .get();

                const lastAwarded = awardedDoc.exists ? awardedDoc.data().lastAwarded : null;
                const currentWeek = this.weekStart.toISOString();

                if (lastAwarded !== currentWeek) {
                    await this.awardStudentOfWeek(winner.uid);
                    
                    // Mark as awarded
                    await db.collection('system_flags').doc('student_of_week').set({
                        lastAwarded: currentWeek,
                        winnerUid: winner.uid,
                        winnerName: winner.name,
                        points: winner.points,
                        awardedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`🏆 Student of the Week awarded to: ${winner.name}`);
                    return winner;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Error auto-checking Student of the Week:', error);
            return null;
        }
    }

    /**
     * Get week progress (days remaining)
     */
    getWeekProgress() {
        const now = new Date();
        const totalDays = 7;
        const daysPassed = Math.floor((now - this.weekStart) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, totalDays - daysPassed - 1);
        return {
            daysPassed: Math.min(daysPassed, 6),
            daysRemaining: daysRemaining,
            percentage: Math.min(Math.round((daysPassed / totalDays) * 100), 100)
        };
    }

    /**
     * Get student's weekly ranking
     */
    async getStudentWeeklyRank(uid) {
        try {
            const leaderboard = await this.getWeeklyLeaderboard(100);
            const index = leaderboard.findIndex(s => s.uid === uid);
            return index !== -1 ? index + 1 : null;
        } catch (error) {
            console.error('❌ Error getting rank:', error);
            return null;
        }
    }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================
let studentOfWeek = null;

function initStudentOfWeek() {
    studentOfWeek = new StudentOfWeek();
    return studentOfWeek;
}