/**
 * Tawi High-Fidelity Mock Dataset — St. Mary's Primary School
 * 
 * 5 Classes · ~20 Learners Each · ~100 Total Learners
 * 
 * Classes:
 *   PP1 Yellow       — 20 learners (c1000000-0000-0000-0000-000000000001)
 *   Grade 1 Yellow   — 20 learners (c1000000-0000-0000-0000-000000000002)
 *   Grade 2 Red      — 20 learners (c1000000-0000-0000-0000-000000000003)
 *   Grade 3 Blue     — 20 learners (c1000000-0000-0000-0000-000000000004)
 *   Grade 4 Blue     — 20 learners (c1000000-0000-0000-0000-000000000005)
 * 
 * Key instructional stories embedded:
 *   Brian Mwangi (G3 Blue)    — Attendance decline + academic fall + misconduct
 *   Amina Hassan (G2 Red)     — Perfect attendance + recurrent place-value error
 *   Kevin Kiprono (G4 Blue)   — Chronic Friday absenteeism
 *   Faith Muthoni (G1 Yellow) — Star performer, 100% attendance, rapid progress
 *   Zawadi Omondi (PP1 Yellow)— Emerging early literacy concern
 */

import {
  createLearner,
  createEvent,
  EVENT_TYPES,
  ATTENDANCE_ACTIONS,
  CLASSWORK_ACTIONS,
  INCIDENT_ACTIONS,
} from './schema.js';

const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
let _adm = 1001;
const adm = () => String(_adm++);

function L(id, classId, className, firstName, lastName, gender, dob, guardian, phone, section = 'A') {
  return createLearner({
    id,
    schoolId: SCHOOL_ID,
    classId,
    className,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    dateOfBirth: dob,
    guardianName: guardian,
    guardianPhone: phone,
    section,
    admissionNumber: adm(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEARNERS
// ─────────────────────────────────────────────────────────────────────────────
export function getMockLearners() {
  return [

    // ══════════════════════════════════════════════════════════════
    // PP1 YELLOW  (c1000000-0000-0000-0000-000000000001)  — 20 learners
    // ══════════════════════════════════════════════════════════════
    L('d1000000-0000-0000-0000-01','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Zawadi','Omondi',   'Female','2020-02-14','Beatrice Omondi',  '+254711000001'),
    L('d1000000-0000-0000-0000-02','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Liam',   'Kiprop',  'Male',  '2020-05-20','Moses Kiprop',     '+254711000002'),
    L('d1000000-0000-0000-0000-03','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Hana',   'Waweru',  'Female','2020-01-07','Susan Waweru',     '+254711000003'),
    L('d1000000-0000-0000-0000-04','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Elijah', 'Mutua',   'Male',  '2020-08-30','Rose Mutua',       '+254711000004'),
    L('d1000000-0000-0000-0000-05','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Grace',  'Akinyi',  'Female','2020-03-18','Collins Onyango',  '+254711000005'),
    L('d1000000-0000-0000-0000-06','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Tobias', 'Njogu',   'Male',  '2020-06-11','Ann Wanja',        '+254711000006'),
    L('d1000000-0000-0000-0000-07','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Purity', 'Chebet',  'Female','2020-04-25','Isaac Chebet',     '+254711000007'),
    L('d1000000-0000-0000-0000-08','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Victor', 'Kamau',   'Male',  '2020-09-01','Grace Njeri',      '+254711000008'),
    L('d1000000-0000-0000-0000-09','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Amani',  'Otieno',  'Male',  '2020-07-16','Ruth Awuor',       '+254711000009'),
    L('d1000000-0000-0000-0000-10','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Zara',   'Mwenda',  'Female','2020-02-28','Patrick Mwenda',   '+254711000010'),
    L('d1000000-0000-0000-0000-11','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Noah',   'Gitau',   'Male',  '2020-11-13','Lydia Gitau',      '+254711000011'),
    L('d1000000-0000-0000-0000-12','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Leila',  'Rono',    'Female','2020-05-05','Joel Rono',        '+254711000012'),
    L('d1000000-0000-0000-0000-13','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Daniel', 'Mbithi',  'Male',  '2020-08-21','Esther Mbithi',    '+254711000013'),
    L('d1000000-0000-0000-0000-14','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Violet', 'Muriuki', 'Female','2020-01-30','Charles Muriuki',  '+254711000014'),
    L('d1000000-0000-0000-0000-15','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Ezra',   'Oloo',    'Male',  '2020-10-09','Mercy Oloo',       '+254711000015'),
    L('d1000000-0000-0000-0000-16','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Sana',   'Wairimu', 'Female','2020-03-03','Peter Wairimu',    '+254711000016'),
    L('d1000000-0000-0000-0000-17','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Leon',   'Sang',    'Male',  '2020-06-17','Agnes Cherotich',  '+254711000017'),
    L('d1000000-0000-0000-0000-18','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Bella',  'Ndungu',  'Female','2020-09-29','Simon Ndungu',     '+254711000018'),
    L('d1000000-0000-0000-0000-19','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Eric',   'Obiero',  'Male',  '2020-12-04','Mary Achieng',     '+254711000019'),
    L('d1000000-0000-0000-0000-20','c1000000-0000-0000-0000-000000000001','PP1 Yellow','Nadia',  'Karanja', 'Female','2020-07-07','Joseph Karanja',   '+254711000020'),

    // ══════════════════════════════════════════════════════════════
    // GRADE 1 YELLOW  (c1000000-0000-0000-0000-000000000002)  — 20 learners
    // ══════════════════════════════════════════════════════════════
    L('d2000000-0000-0000-0000-01','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Faith',   'Muthoni', 'Female','2018-11-03','James Kamau',      '+254722000001'),
    L('d2000000-0000-0000-0000-02','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Moses',   'Odhiambo','Male',  '2018-04-22','Stella Adhiambo',  '+254722000002'),
    L('d2000000-0000-0000-0000-03','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Celine',  'Wangari', 'Female','2019-01-14','George Wangari',   '+254722000003'),
    L('d2000000-0000-0000-0000-04','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Allan',   'Kipchoge','Male',  '2018-08-08','Lilian Chepkorir', '+254722000004'),
    L('d2000000-0000-0000-0000-05','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Tabitha', 'Njiru',   'Female','2018-05-31','Samuel Njiru',     '+254722000005'),
    L('d2000000-0000-0000-0000-06','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Nathan',  'Mumo',    'Male',  '2019-02-19','Mary Mwangi',      '+254722000006'),
    L('d2000000-0000-0000-0000-07','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Brenda',  'Cherono', 'Female','2018-10-11','Boaz Kipchoge',    '+254722000007'),
    L('d2000000-0000-0000-0000-08','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Paul',    'Simiyu',  'Male',  '2019-03-24','Jane Nanjala',     '+254722000008'),
    L('d2000000-0000-0000-0000-09','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Irene',   'Wambua',  'Female','2018-12-01','David Wambua',     '+254722000009'),
    L('d2000000-0000-0000-0000-10','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Caleb',   'Otieno',  'Male',  '2018-07-27','Phoebe Auma',      '+254722000010'),
    L('d2000000-0000-0000-0000-11','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Ruth',    'Ndirangu','Female','2018-06-05','John Ndirangu',    '+254722000011'),
    L('d2000000-0000-0000-0000-12','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Felix',   'Kamande', 'Male',  '2019-01-29','Sarah Kamande',    '+254722000012'),
    L('d2000000-0000-0000-0000-13','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Daisy',   'Waithaka','Female','2018-09-13','Philip Waithaka',  '+254722000013'),
    L('d2000000-0000-0000-0000-14','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Denis',   'Gitonga', 'Male',  '2018-04-04','Florence Gitonga', '+254722000014'),
    L('d2000000-0000-0000-0000-15','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Pauline', 'Kimani',  'Female','2018-11-19','Edward Kimani',    '+254722000015'),
    L('d2000000-0000-0000-0000-16','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Charles', 'Ng\'ang\'a','Male','2018-07-03','Rose Kamau',       '+254722000016'),
    L('d2000000-0000-0000-0000-17','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Shirley', 'Obuya',   'Female','2019-02-07','Peter Obuya',      '+254722000017'),
    L('d2000000-0000-0000-0000-18','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Arnold',  'Muchiri', 'Male',  '2018-10-30','Agnes Wanjiku',    '+254722000018'),
    L('d2000000-0000-0000-0000-19','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Stella',  'Makena',  'Female','2018-08-21','Daniel Makena',    '+254722000019'),
    L('d2000000-0000-0000-0000-20','c1000000-0000-0000-0000-000000000002','Grade 1 Yellow','Kevin',   'Waweru',  'Male',  '2018-05-15','Christine Ngugi',  '+254722000020'),

    // ══════════════════════════════════════════════════════════════
    // GRADE 2 RED  (c1000000-0000-0000-0000-000000000003)  — 20 learners
    // ══════════════════════════════════════════════════════════════
    L('d3000000-0000-0000-0000-01','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Amina',   'Hassan',  'Female','2017-08-25','Omar Hassan',      '+254733000001'),
    L('d3000000-0000-0000-0000-02','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Sharon',  'Auma',    'Female','2017-03-11','Lilian Otieno',    '+254733000002'),
    L('d3000000-0000-0000-0000-03','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Patrick', 'Njenga',  'Male',  '2017-06-14','Ann Njenga',       '+254733000003'),
    L('d3000000-0000-0000-0000-04','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Beatrice','Cherop',  'Female','2017-09-02','Wilson Cherop',    '+254733000004'),
    L('d3000000-0000-0000-0000-05','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Steven',  'Mwangi',  'Male',  '2017-01-18','Margaret Wambui',  '+254733000005'),
    L('d3000000-0000-0000-0000-06','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Lydia',   'Wanjiku', 'Female','2017-11-07','Anthony Kamau',    '+254733000006'),
    L('d3000000-0000-0000-0000-07','c1000000-0000-0000-0000-000000000003','Grade 2 Red','George',  'Ochieng', 'Male',  '2017-04-29','Alice Auko',       '+254733000007'),
    L('d3000000-0000-0000-0000-08','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Charity', 'Mutiso',  'Female','2017-07-21','Bernard Mutiso',   '+254733000008'),
    L('d3000000-0000-0000-0000-09','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Isaac',   'Kamau',   'Male',  '2017-02-12','Eunice Wambua',    '+254733000009'),
    L('d3000000-0000-0000-0000-10','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Agnes',   'Mbithe',  'Female','2017-10-05','Francis Mbithi',   '+254733000010'),
    L('d3000000-0000-0000-0000-11','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Mark',    'Rotich',  'Male',  '2017-05-16','Dorcas Rotich',    '+254733000011'),
    L('d3000000-0000-0000-0000-12','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Purity',  'Ouma',    'Female','2017-08-04','Vincent Ouma',     '+254733000012'),
    L('d3000000-0000-0000-0000-13','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Dennis',  'Mwiti',   'Male',  '2017-01-29','Elizabeth Mwiti',  '+254733000013'),
    L('d3000000-0000-0000-0000-14','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Fatuma',  'Musa',    'Female','2017-07-11','Hassan Musa',      '+254733000014'),
    L('d3000000-0000-0000-0000-15','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Philip',  'Kimani',  'Male',  '2017-03-25','Josephine Kimani', '+254733000015'),
    L('d3000000-0000-0000-0000-16','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Linda',   'Weru',    'Female','2017-11-18','Thomas Weru',      '+254733000016'),
    L('d3000000-0000-0000-0000-17','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Gerald',  'Ng\'ang\'a','Male', '2017-06-03','Caroline Njeri',   '+254733000017'),
    L('d3000000-0000-0000-0000-18','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Carolyn', 'Chebet',  'Female','2017-02-20','Robert Chebet',    '+254733000018'),
    L('d3000000-0000-0000-0000-19','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Victor',  'Otieno',  'Male',  '2017-09-14','Leah Otieno',      '+254733000019'),
    L('d3000000-0000-0000-0000-20','c1000000-0000-0000-0000-000000000003','Grade 2 Red','Grace',   'Mugo',    'Female','2017-04-08','Albert Mugo',      '+254733000020'),

    // ══════════════════════════════════════════════════════════════
    // GRADE 3 BLUE  (c1000000-0000-0000-0000-000000000004)  — 20 learners
    // ══════════════════════════════════════════════════════════════
    L('d4000000-0000-0000-0000-01','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Brian',   'Mwangi',  'Male',  '2016-04-12','Grace Wanjiku',    '+254744000001'),
    L('d4000000-0000-0000-0000-02','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','David',   'Ochieng', 'Male',  '2016-09-14','Mary Awino',       '+254744000002'),
    L('d4000000-0000-0000-0000-03','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Mercy',   'Chebet',  'Female','2016-01-30','Peter Koech',      '+254744000003'),
    L('d4000000-0000-0000-0000-04','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','John',    'Kamau',   'Male',  '2016-06-19','Jane Wambui',      '+254744000004'),
    L('d4000000-0000-0000-0000-05','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Esther',  'Ngugi',   'Female','2016-03-07','Daniel Ngugi',     '+254744000005'),
    L('d4000000-0000-0000-0000-06','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Simon',   'Kipchoge','Male',  '2016-10-23','Hannah Chebet',    '+254744000006'),
    L('d4000000-0000-0000-0000-07','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Veronica','Wambua',  'Female','2016-07-14','Eric Wambua',      '+254744000007'),
    L('d4000000-0000-0000-0000-08','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Peter',   'Mwenda',  'Male',  '2016-02-01','Christine Mwenda', '+254744000008'),
    L('d4000000-0000-0000-0000-09','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Caroline','Auma',    'Female','2016-11-18','Victor Odhiambo',  '+254744000009'),
    L('d4000000-0000-0000-0000-10','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','James',   'Muriuki', 'Male',  '2016-08-05','Lydia Muriuki',    '+254744000010'),
    L('d4000000-0000-0000-0000-11','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Rebecca', 'Gitau',   'Female','2016-05-27','Simon Gitau',      '+254744000011'),
    L('d4000000-0000-0000-0000-12','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Mark',    'Omondi',  'Male',  '2016-12-09','Agnes Atieno',     '+254744000012'),
    L('d4000000-0000-0000-0000-13','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Lydia',   'Mugo',    'Female','2016-04-30','Leonard Mugo',     '+254744000013'),
    L('d4000000-0000-0000-0000-14','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','George',  'Chege',   'Male',  '2016-09-02','Susan Wairimu',    '+254744000014'),
    L('d4000000-0000-0000-0000-15','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Pheobe',  'Simiyu',  'Female','2016-01-15','Caleb Simiyu',     '+254744000015'),
    L('d4000000-0000-0000-0000-16','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Vincent', 'Karanja', 'Male',  '2016-07-28','Rose Karanja',     '+254744000016'),
    L('d4000000-0000-0000-0000-17','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Charity', 'Njogu',   'Female','2016-03-21','Abraham Njogu',    '+254744000017'),
    L('d4000000-0000-0000-0000-18','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Dennis',  'Sang',    'Male',  '2016-10-11','Irene Cherotich',  '+254744000018'),
    L('d4000000-0000-0000-0000-19','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Florence','Waweru',  'Female','2016-06-03','Kenneth Waweru',   '+254744000019'),
    L('d4000000-0000-0000-0000-20','c1000000-0000-0000-0000-000000000004','Grade 3 Blue','Alfred',  'Mutua',   'Male',  '2016-02-24','Patricia Mutua',   '+254744000020'),

    // ══════════════════════════════════════════════════════════════
    // GRADE 4 BLUE  (c1000000-0000-0000-0000-000000000005)  — 20 learners
    // ══════════════════════════════════════════════════════════════
    L('d5000000-0000-0000-0000-01','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Kevin',   'Kiprono', 'Male',  '2015-02-18','Sarah Cherono',    '+254755000001'),
    L('d5000000-0000-0000-0000-02','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Mary',    'Njeri',   'Female','2015-07-11','Peter Kamau',      '+254755000002'),
    L('d5000000-0000-0000-0000-03','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Samuel',  'Omondi',  'Male',  '2015-04-24','Eunice Achieng',   '+254755000003'),
    L('d5000000-0000-0000-0000-04','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Pauline', 'Rotich',  'Female','2015-09-16','John Rotich',      '+254755000004'),
    L('d5000000-0000-0000-0000-05','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Moses',   'Wakaba',  'Male',  '2015-01-28','Lydia Wambui',     '+254755000005'),
    L('d5000000-0000-0000-0000-06','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Esther',  'Mwangi',  'Female','2015-10-14','Allan Mwangi',     '+254755000006'),
    L('d5000000-0000-0000-0000-07','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Joel',    'Orwa',    'Male',  '2015-05-07','Beatrice Orwa',    '+254755000007'),
    L('d5000000-0000-0000-0000-08','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Agnes',   'Chepkorir','Female','2015-08-30','Robert Kipkorir',  '+254755000008'),
    L('d5000000-0000-0000-0000-09','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Elijah',  'Gitonga', 'Male',  '2015-03-19','Irene Gitonga',    '+254755000009'),
    L('d5000000-0000-0000-0000-10','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Ruth',    'Kimani',  'Female','2015-11-06','Bernard Kimani',   '+254755000010'),
    L('d5000000-0000-0000-0000-11','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Isaac',   'Muriuki', 'Male',  '2015-06-21','Dorothy Muriuki',  '+254755000011'),
    L('d5000000-0000-0000-0000-12','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Purity',  'Kamande', 'Female','2015-01-09','Paul Kamande',     '+254755000012'),
    L('d5000000-0000-0000-0000-13','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Arnold',  'Ouma',    'Male',  '2015-09-27','Rose Atieno',      '+254755000013'),
    L('d5000000-0000-0000-0000-14','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Stella',  'Ndirangu','Female','2015-04-15','George Ndirangu',  '+254755000014'),
    L('d5000000-0000-0000-0000-15','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Denis',   'Cheruiyot','Male', '2015-07-02','Tabitha Cheruiyot','+254755000015'),
    L('d5000000-0000-0000-0000-16','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Linda',   'Wangui',  'Female','2015-12-18','Charles Wangui',   '+254755000016'),
    L('d5000000-0000-0000-0000-17','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Felix',   'Mugo',    'Male',  '2015-03-04','Charity Mugo',     '+254755000017'),
    L('d5000000-0000-0000-0000-18','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Daisy',   'Obiero',  'Female','2015-08-13','Simon Obiero',     '+254755000018'),
    L('d5000000-0000-0000-0000-19','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Gerald',  'Weru',    'Male',  '2015-05-30','Jane Weru',        '+254755000019'),
    L('d5000000-0000-0000-0000-20','c1000000-0000-0000-0000-000000000005','Grade 4 Blue','Carolyn', 'Makena',  'Female','2015-10-07','Victor Makena',    '+254755000020'),

  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────
export function getMockEvents() {
  const events = [];
  const add = (ev) => events.push(createEvent({ schoolId: SCHOOL_ID, ...ev }));

  // ── 1. BRIAN MWANGI (d4000000-0000-0000-0000-01) ─────────────────────────────────────────────
  // Story: Good start, then attendance collapse + academic fall + misconduct
  [
    '2026-10-13','2026-10-14','2026-10-27',
    '2026-11-03','2026-11-04','2026-11-10','2026-11-17',
  ].forEach(date => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT,
    learnerId: 'd4000000-0000-0000-0000-01', className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004',
    date, source: 'Daily Register',
  }));

  // Brian academic decline
  [
    { date:'2026-09-25', score:39, outOf:50, topic:'Basic Multiplication',         src:'Mid-Term Assessment 1',     pct:78 },
    { date:'2026-10-16', score:31, outOf:50, topic:'Long Division & Word Problems', src:'Continuous Assessment 2',   pct:62 },
    { date:'2026-11-06', score:21, outOf:50, topic:'Fractions & Place Value',       src:'Monthly Progress Test',     pct:42 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd4000000-0000-0000-0000-01',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: a.date,
    value: { subject: 'Mathematics', score: a.score, outOf: a.outOf, percentage: a.pct, topic: a.topic },
    source: a.src,
  }));

  add({ type: EVENT_TYPES.CLASSWORK, action: CLASSWORK_ACTIONS.INCOMPLETE, learnerId: 'd4000000-0000-0000-0000-01',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-10-28',
    value: { task: 'Maths Exercise Book p.44' }, source: 'Homework Inspection' });
  add({ type: EVENT_TYPES.CLASSWORK, action: CLASSWORK_ACTIONS.INCOMPLETE, learnerId: 'd4000000-0000-0000-0000-01',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-11-05',
    value: { task: 'English Comprehension Exercise' }, source: 'Homework Inspection' });
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.DISCIPLINE, learnerId: 'd4000000-0000-0000-0000-01',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-10-21',
    value: { details: 'Disrupting group lesson, arguing with peers during reading time' },
    source: 'Class Teacher' });
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.OFFICE_REFERRAL, learnerId: 'd4000000-0000-0000-0000-01',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-11-09',
    value: { details: 'Repeated non-participation and leaving compound during break' },
    source: 'Deputy Head Teacher' });

  // ── 2. AMINA HASSAN (d3000000-0000-0000-0000-01) ─────────────────────────────────────────────
  // Story: 100% attendance, recurring place-value error
  [
    { date:'2026-10-10', score:18, outOf:30, pct:60, topic:'Addition with carrying',    tag:'place_value_carrying' },
    { date:'2026-10-24', score:17, outOf:30, pct:57, topic:'Subtraction with borrowing',tag:'place_value_borrowing' },
    { date:'2026-11-14', score:19, outOf:30, pct:63, topic:'2-digit multiplication',    tag:'column_alignment' },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd3000000-0000-0000-0000-01',
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: a.date,
    value: { subject: 'Mathematics', score: a.score, outOf: a.outOf, percentage: a.pct, topic: a.topic, tag: a.tag },
    source: 'Weekly Quiz',
  }));

  add({ type: EVENT_TYPES.NOTE, action: 'observation', learnerId: 'd3000000-0000-0000-0000-01',
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: '2026-11-02',
    value: { subject: 'Mathematics', note: 'Needs concrete manipulatives (counters/blocks) for 2-digit regrouping. Highly attentive & eager.' },
    source: 'Class Teacher Note' });
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.COMMENDATION, learnerId: 'd3000000-0000-0000-0000-01',
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: '2026-11-12',
    value: { details: 'Exemplary handwriting and neatness in exercise books' },
    source: 'Headteacher Assembly Award' });

  // ── 3. KEVIN KIPRONO (d5000000-0000-0000-0000-01) ─────────────────────────────────────────────
  // Story: Chronic Friday absenteeism
  ['2026-10-09','2026-10-16','2026-10-23','2026-10-30','2026-11-06','2026-11-13'].forEach(date =>
    add({ type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: 'd5000000-0000-0000-0000-01',
      className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date,
      value: { details: 'Pattern alert: absent on a Friday' }, source: 'Daily Register' }));
  add({ type: EVENT_TYPES.CLASSWORK, action: CLASSWORK_ACTIONS.INCOMPLETE, learnerId: 'd5000000-0000-0000-0000-01',
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-09',
    value: { task: 'Science Practical Summary (Friday session)' }, source: 'Subject Teacher' });
  add({ type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd5000000-0000-0000-0000-01',
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-11',
    value: { subject: 'Science', score: 44, outOf: 100, percentage: 44, topic: 'Living and Non-Living Things' },
    source: 'End of Month Test' });

  // ── 4. FAITH MUTHONI (d2000000-0000-0000-0000-01) ─────────────────────────────────────────────
  // Story: Star performer, 100% attendance, rapid progress
  add({ type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd2000000-0000-0000-0000-01',
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002', date: '2026-10-15',
    value: { subject: 'Language & Literacy', score: 29, outOf: 30, percentage: 97, topic: 'Phonics & Blends' },
    source: 'Early Grade Reading Assessment' });
  add({ type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd2000000-0000-0000-0000-01',
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002', date: '2026-11-14',
    value: { subject: 'Mathematics', score: 28, outOf: 30, percentage: 93, topic: 'Counting & Number Recognition' },
    source: 'Class Quiz' });
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.COMMENDATION, learnerId: 'd2000000-0000-0000-0000-01',
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002', date: '2026-11-04',
    value: { details: 'Reading aloud fluently to the whole class — remarkable progress for the term.' },
    source: 'Class Teacher Award' });

  // ── 5. ZAWADI OMONDI (d1000000-0000-0000-0000-01) ─────────────────────────────────────────────
  // Story: Early literacy concern — recognises fewer than half the alphabet letters at PP1
  add({ type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: 'd1000000-0000-0000-0000-01',
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: '2026-10-20',
    value: { subject: 'Language & Literacy', score: 11, outOf: 26, percentage: 42, topic: 'Alphabet Letter Recognition' },
    source: 'Early Grade Reading Screening' });
  add({ type: EVENT_TYPES.NOTE, action: 'observation', learnerId: 'd1000000-0000-0000-0000-01',
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: '2026-10-22',
    value: { subject: 'Language & Literacy', note: 'Struggles to identify letters b/d/p — reversal pattern. Recommend targeted letter formation exercises.' },
    source: 'PP1 Teacher Observation' });
  add({ type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: 'd1000000-0000-0000-0000-01',
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: '2026-11-03',
    source: 'Daily Register' });
  add({ type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: 'd1000000-0000-0000-0000-01',
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: '2026-11-11',
    source: 'Daily Register' });

  // ── GENERAL CLASS ACTIVITY — PP1 Yellow ───────────────────────────────────
  // Some learners with assessments + attendance marks to populate the view
  [
    { id:'d1000000-0000-0000-0000-02', score:16, outOf:20, pct:80, topic:'Number Recognition 1–10', date:'2026-10-20' },
    { id:'d1000000-0000-0000-0000-05', score:18, outOf:20, pct:90, topic:'Number Recognition 1–10', date:'2026-10-20' },
    { id:'d1000000-0000-0000-0000-11', score:14, outOf:20, pct:70, topic:'Number Recognition 1–10', date:'2026-10-20' },
    { id:'d1000000-0000-0000-0000-17', score:19, outOf:20, pct:95, topic:'Number Recognition 1–10', date:'2026-10-20' },
    { id:'d1000000-0000-0000-0000-20', score:12, outOf:20, pct:60, topic:'Number Recognition 1–10', date:'2026-10-20' },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: a.date,
    value: { subject: 'Mathematics', score: a.score, outOf: a.outOf, percentage: a.pct, topic: a.topic },
    source: 'PP1 Activity Assessment',
  }));

  // PP1 attendance spot-marks
  [
    { id:'d1000000-0000-0000-0000-04', date:'2026-11-10' },
    { id:'d1000000-0000-0000-0000-09', date:'2026-11-14' },
    { id:'d1000000-0000-0000-0000-14', date:'2026-10-28' },
  ].forEach(a => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: a.id,
    className: 'PP1 Yellow', classId: 'c1000000-0000-0000-0000-000000000001', date: a.date,
    source: 'Daily Register',
  }));

  // ── GENERAL CLASS ACTIVITY — Grade 1 Yellow ───────────────────────────────
  [
    { id:'d2000000-0000-0000-0000-02', score:22, outOf:30, pct:73, topic:'Phonics – Short Vowels', date:'2026-10-15' },
    { id:'d2000000-0000-0000-0000-04', score:28, outOf:30, pct:93, topic:'Phonics – Short Vowels', date:'2026-10-15' },
    { id:'d2000000-0000-0000-0000-07', score:20, outOf:30, pct:67, topic:'Phonics – Short Vowels', date:'2026-10-15' },
    { id:'d2000000-0000-0000-0000-12', score:17, outOf:30, pct:57, topic:'Phonics – Short Vowels', date:'2026-10-15' },
    { id:'d2000000-0000-0000-0000-18', score:25, outOf:30, pct:83, topic:'Phonics – Short Vowels', date:'2026-10-15' },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002', date: a.date,
    value: { subject: 'Language & Literacy', score: a.score, outOf: a.outOf, percentage: a.pct, topic: a.topic },
    source: 'Early Grade Reading Assessment',
  }));

  // Grade 1 numeracy
  [
    { id:'d2000000-0000-0000-0000-03', score:24, outOf:30, pct:80, date:'2026-11-14' },
    { id:'d2000000-0000-0000-0000-09', score:26, outOf:30, pct:87, date:'2026-11-14' },
    { id:'d2000000-0000-0000-0000-15', score:21, outOf:30, pct:70, date:'2026-11-14' },
    { id:'d2000000-0000-0000-0000-20', score:29, outOf:30, pct:97, date:'2026-11-14' },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002', date: a.date,
    value: { subject: 'Mathematics', score: a.score, outOf: 30, percentage: a.pct, topic: 'Counting & Number Recognition' },
    source: 'Class Quiz',
  }));

  // Grade 1 absences
  ['d2000000-0000-0000-0000-06','d2000000-0000-0000-0000-11','d2000000-0000-0000-0000-17'].forEach((id, i) => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: id,
    className: 'Grade 1 Yellow', classId: 'c1000000-0000-0000-0000-000000000002',
    date: ['2026-11-03','2026-11-10','2026-11-13'][i],
    source: 'Daily Register',
  }));

  // ── GENERAL CLASS ACTIVITY — Grade 2 Red ─────────────────────────────────
  // Mid-term Maths: mixed results
  [
    { id:'d3000000-0000-0000-0000-02', score:22, outOf:30, pct:73 },
    { id:'d3000000-0000-0000-0000-03', score:27, outOf:30, pct:90 },
    { id:'d3000000-0000-0000-0000-04', score:15, outOf:30, pct:50 },
    { id:'d3000000-0000-0000-0000-05', score:23, outOf:30, pct:77 },
    { id:'d3000000-0000-0000-0000-07', score:11, outOf:30, pct:37 },
    { id:'d3000000-0000-0000-0000-09', score:25, outOf:30, pct:83 },
    { id:'d3000000-0000-0000-0000-12', score:18, outOf:30, pct:60 },
    { id:'d3000000-0000-0000-0000-16', score:28, outOf:30, pct:93 },
    { id:'d3000000-0000-0000-0000-19', score:20, outOf:30, pct:67 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: '2026-10-24',
    value: { subject: 'Mathematics', score: a.score, outOf: a.outOf, percentage: a.pct, topic: 'Subtraction with borrowing' },
    source: 'Weekly Quiz',
  }));

  // Grade 2 absences
  [
    { id:'d3000000-0000-0000-0000-04', date:'2026-10-14' },
    { id:'d3000000-0000-0000-0000-07', date:'2026-10-21' },
    { id:'d3000000-0000-0000-0000-07', date:'2026-10-22' },
    { id:'d3000000-0000-0000-0000-14', date:'2026-11-05' },
    { id:'d3000000-0000-0000-0000-17', date:'2026-11-10' },
  ].forEach(a => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: a.id,
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: a.date,
    source: 'Daily Register',
  }));

  // Grade 2 observations
  add({ type: EVENT_TYPES.NOTE, action: 'observation', learnerId: 'd3000000-0000-0000-0000-07',
    className: 'Grade 2 Red', classId: 'c1000000-0000-0000-0000-000000000003', date: '2026-10-23',
    value: { subject: 'Mathematics', note: 'George Ochieng: consistently below 40% in Maths. Recommend early intervention and parent meeting.' },
    source: 'Class Teacher Note' });

  // ── GENERAL CLASS ACTIVITY — Grade 3 Blue ────────────────────────────────
  // Grade 3 English comprehension test
  [
    { id:'d4000000-0000-0000-0000-02', score:36, outOf:50, pct:72 },
    { id:'d4000000-0000-0000-0000-03', score:44, outOf:50, pct:88 },
    { id:'d4000000-0000-0000-0000-05', score:40, outOf:50, pct:80 },
    { id:'d4000000-0000-0000-0000-06', score:33, outOf:50, pct:66 },
    { id:'d4000000-0000-0000-0000-08', score:47, outOf:50, pct:94 },
    { id:'d4000000-0000-0000-0000-11', score:38, outOf:50, pct:76 },
    { id:'d4000000-0000-0000-0000-14', score:29, outOf:50, pct:58 },
    { id:'d4000000-0000-0000-0000-17', score:42, outOf:50, pct:84 },
    { id:'d4000000-0000-0000-0000-19', score:45, outOf:50, pct:90 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-11-07',
    value: { subject: 'English', score: a.score, outOf: a.outOf, percentage: a.pct, topic: 'Reading Comprehension' },
    source: 'Monthly Assessment',
  }));

  // Grade 3 Maths test (everyone except Brian already above)
  [
    { id:'d4000000-0000-0000-0000-02', score:38, outOf:50, pct:76 },
    { id:'d4000000-0000-0000-0000-04', score:30, outOf:50, pct:60 },
    { id:'d4000000-0000-0000-0000-06', score:43, outOf:50, pct:86 },
    { id:'d4000000-0000-0000-0000-10', score:35, outOf:50, pct:70 },
    { id:'d4000000-0000-0000-0000-12', score:48, outOf:50, pct:96 },
    { id:'d4000000-0000-0000-0000-15', score:27, outOf:50, pct:54 },
    { id:'d4000000-0000-0000-0000-19', score:46, outOf:50, pct:92 },
    { id:'d4000000-0000-0000-0000-20', score:41, outOf:50, pct:82 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-11-06',
    value: { subject: 'Mathematics', score: a.score, outOf: a.outOf, percentage: a.pct, topic: 'Fractions & Place Value' },
    source: 'Monthly Progress Test',
  }));

  // Grade 3 absences
  [
    { id:'d4000000-0000-0000-0000-02', date:'2026-11-17' },
    { id:'d4000000-0000-0000-0000-09', date:'2026-11-04' },
    { id:'d4000000-0000-0000-0000-14', date:'2026-10-20' },
    { id:'d4000000-0000-0000-0000-16', date:'2026-10-30' },
  ].forEach(a => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: a.id,
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: a.date,
    source: 'Daily Register',
  }));

  // Grade 3 commendation
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.COMMENDATION, learnerId: 'd4000000-0000-0000-0000-12',
    className: 'Grade 3 Blue', classId: 'c1000000-0000-0000-0000-000000000004', date: '2026-11-14',
    value: { details: 'Mark Omondi: highest Maths score in class (96%). Recommended for academic prize.' },
    source: 'Class Teacher' });

  // ── GENERAL CLASS ACTIVITY — Grade 4 Blue ────────────────────────────────
  // Grade 4 Science exam
  [
    { id:'d5000000-0000-0000-0000-02', score:71, outOf:100, pct:71 },
    { id:'d5000000-0000-0000-0000-03', score:85, outOf:100, pct:85 },
    { id:'d5000000-0000-0000-0000-05', score:62, outOf:100, pct:62 },
    { id:'d5000000-0000-0000-0000-07', score:78, outOf:100, pct:78 },
    { id:'d5000000-0000-0000-0000-09', score:55, outOf:100, pct:55 },
    { id:'d5000000-0000-0000-0000-11', score:90, outOf:100, pct:90 },
    { id:'d5000000-0000-0000-0000-14', score:67, outOf:100, pct:67 },
    { id:'d5000000-0000-0000-0000-17', score:83, outOf:100, pct:83 },
    { id:'d5000000-0000-0000-0000-20', score:76, outOf:100, pct:76 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-11',
    value: { subject: 'Science', score: a.score, outOf: a.outOf, percentage: a.pct, topic: 'Living and Non-Living Things' },
    source: 'End of Month Test',
  }));

  // Grade 4 English
  [
    { id:'d5000000-0000-0000-0000-02', score:77, outOf:100, pct:77 },
    { id:'d5000000-0000-0000-0000-04', score:88, outOf:100, pct:88 },
    { id:'d5000000-0000-0000-0000-06', score:92, outOf:100, pct:92 },
    { id:'d5000000-0000-0000-0000-08', score:65, outOf:100, pct:65 },
    { id:'d5000000-0000-0000-0000-12', score:70, outOf:100, pct:70 },
    { id:'d5000000-0000-0000-0000-16', score:84, outOf:100, pct:84 },
  ].forEach(a => add({
    type: EVENT_TYPES.ASSESSMENT, action: 'score', learnerId: a.id,
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-07',
    value: { subject: 'English', score: a.score, outOf: 100, percentage: a.pct, topic: 'Essay & Composition' },
    source: 'Monthly Assessment',
  }));

  // Grade 4 absences
  [
    { id:'d5000000-0000-0000-0000-05', date:'2026-10-15' },
    { id:'d5000000-0000-0000-0000-09', date:'2026-11-04' },
    { id:'d5000000-0000-0000-0000-09', date:'2026-11-05' },
    { id:'d5000000-0000-0000-0000-13', date:'2026-10-28' },
    { id:'d5000000-0000-0000-0000-18', date:'2026-11-10' },
  ].forEach(a => add({
    type: EVENT_TYPES.ATTENDANCE, action: ATTENDANCE_ACTIONS.ABSENT, learnerId: a.id,
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: a.date,
    source: 'Daily Register',
  }));

  // Grade 4 star performer
  add({ type: EVENT_TYPES.INCIDENT, action: INCIDENT_ACTIONS.COMMENDATION, learnerId: 'd5000000-0000-0000-0000-11',
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-14',
    value: { details: 'Isaac Muriuki: top of class in Science (90%). Demonstrated leadership during group practical work.' },
    source: 'Class Teacher Award' });

  // Grade 4 concern
  add({ type: EVENT_TYPES.NOTE, action: 'observation', learnerId: 'd5000000-0000-0000-0000-09',
    className: 'Grade 4 Blue', classId: 'c1000000-0000-0000-0000-000000000005', date: '2026-11-06',
    value: { subject: 'General', note: 'Elijah Gitonga: 2 consecutive absences, missed Science practical. Parent contact recommended.' },
    source: 'Class Teacher Note' });

  return events;
}
