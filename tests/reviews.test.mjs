/* node tests/reviews.test.mjs — staff-only completion gates */
import { isStaffReviewed, verifiedSubject, verifiedAverage } from '../assets/js/reviews.js';

let passed = 0, failed = 0;
function check(label, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    passed++; console.log('  ok   ' + label);
  } else {
    failed++; console.log(' FAIL  ' + label, 'got', got, 'expected', want);
  }
}

const lesson = { id: 'b1', draft: false };
const zema = { id: 'z1', draft: false };
const approved = { lessonId: 'b1', verified: true, score: 4, of: 5, method: 'oral', reviewedBy: 'teacher1' };
const observed = { lessonId: 'z1', verified: true, score: 0, of: 0, method: 'live-observation', reviewedBy: 'teacher1' };

check('self-reported practice score is not reviewed', isStaffReviewed({ done:true, score:5, of:5 }), false);
check('staff record is recognized', isStaffReviewed(approved), true);
check('a completed browser quiz cannot issue a certificate', verifiedSubject([lesson], { b1: { done:true, score:5, of:5 } }), false);
check('a legitimate staff-reviewed Bible lesson qualifies', verifiedSubject([lesson], {b1: approved}), true);
check('one unreviewed lesson blocks multi-lesson award', verifiedSubject([lesson, {id:'b2'}], {b1: approved}), false);
check('a draft lesson never qualifies', verifiedSubject([{id:'b1', draft:true}], {b1: approved}), false);
check('empty curriculum never earns a certificate', verifiedSubject([], {b1: approved}), false);
check('missing review cannot earn a certificate', verifiedSubject([lesson], {}), false);
check('review of another lesson is rejected', verifiedSubject([lesson], {b1: {...approved, lessonId:'other'}}), false);
check('a browser-shaped review with no staff ID is rejected', verifiedSubject([lesson], {b1: {...approved, reviewedBy:''}}), false);
check('Zema requires a staff observation without a quiz', verifiedSubject([zema], {z1: observed}, {scored:false}), true);
check('Zema cannot claim a scored Bible review', verifiedSubject([zema], {z1: {...observed, score:1, of:1}}, {scored:false}), false);
check('Bible requires actual assessment marks', verifiedSubject([lesson], {b1: {...approved, score:0, of:0}}), false);
check('teacher-reviewed average uses only verified grades', verifiedAverage({b1:approved, b2: {done:true, score:100, of:100}}, ['b1','b2']), 80);
check('without teacher reviews, average is absent', verifiedAverage({}, ['b1']), null);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
