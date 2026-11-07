/* Staff reviews live separately from browser-submitted practice progress.
   A review is a firsthand teacher assessment, not a signature on the score
   that the browser claimed for itself. This module is pure and dependency-free. */

/* An administrator or assigned teacher writes one immutable review document
   for each lesson. No client-controlled progress field can satisfy this. */
export function isStaffReviewed(review) {
  return review?.verified === true &&
    typeof review.reviewedBy === 'string' &&
    review.reviewedBy.length > 0 &&
    typeof review.method === 'string' &&
    ['oral', 'live-observation', 'work-reviewed'].includes(review.method);
}

/* Draft teaching material can never earn a verified certificate.
   For Bible lessons, the staff must supply a real mark denominator.
   For Zema, independent observation is recorded without a quiz score. */
export function verifiedSubject(lessons, reviews, { scored = true } = {}) {
  if (!Array.isArray(lessons) || lessons.length === 0) return false;
  return lessons.every(lesson => {
    if (!lesson || lesson.draft === true) return false;
    const review = reviews?.[lesson.id];
    if (!isStaffReviewed(review) || review.lessonId !== lesson.id) return false;
    if (scored) {
      return Number.isInteger(review.score) && Number.isInteger(review.of) &&
        review.of > 0 && review.of <= 100 &&
        review.score >= 0 && review.score <= review.of;
    }
    return review.score === 0 && review.of === 0;
  });
}

export function verifiedAverage(reviews, lessonIds) {
  let score = 0, total = 0;
  for (const id of lessonIds) {
    const review = reviews?.[id];
    if (!isStaffReviewed(review) || review.lessonId !== id ||
        !Number.isInteger(review.score) || !Number.isInteger(review.of) ||
        review.of <= 0 || review.score < 0 || review.score > review.of) continue;
    score += review.score;
    total += review.of;
  }
  return total > 0 ? Math.round(score / total * 100) : null;
}
