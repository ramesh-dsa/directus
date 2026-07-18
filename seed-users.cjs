const path = require('path');
const crypto = require('crypto');
const argon2 = require('/mnt/Ramesh/Directus/directus/node_modules/.pnpm/argon2@0.44.0/node_modules/argon2/argon2.cjs');
const Database = require('/mnt/Ramesh/Directus/directus/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3/lib/sqlite3.js');

const db = new Database.Database('/mnt/Ramesh/Directus/directus/api/data.db');

const firstNames = [
  'Ajay', 'Vijay', 'Suresh', 'Ramesh', 'Kumar', 'Rajesh', 'Anand', 'Dinesh',
  'Ganesh', 'Manoj', 'Deepak', 'Prakash', 'Arun', 'Naveen', 'Vinod', 'Jegan',
  'Saravanan', 'Muthu', 'Selvan', 'Karthik', 'Priya', 'Divya', 'Sneha', 'Anitha',
  'Kavitha', 'Lakshmi', 'Shanthi', 'Vasantha', 'Radha', 'Geetha', 'Sarah', 'Emily',
  'Jessica', 'Ashley', 'Megan', 'Rachel', 'Lauren', 'Amanda', 'Jennifer', 'Linda'
];

const lastNames = [
  'Kumar', 'Raj', 'Sundar', 'Pillai', 'Iyer', 'Nair', 'Menon', 'Das',
  'Patel', 'Shah', 'Reddy', 'Gupta', 'Verma', 'Singh', 'Yadav', 'Rao',
  'Joshi', 'Desai', 'Mehta', 'Agarwal', 'Smith', 'Johnson', 'Brown', 'Davis',
  'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomEmail(first, last) {
  const num = Math.floor(Math.random() * 9999);
  return `${first.toLowerCase()}.${last.toLowerCase()}${num}@gmail.com`;
}

async function main() {
  const existing = await new Promise((resolve, reject) => {
    db.all('SELECT email FROM directus_users', (err, rows) => {
      if (err) reject(err);
      else resolve(new Set(rows.map(r => r.email)));
    });
  });

  const roleId = 'fa8955f4-34f1-4cc2-b5eb-2f9322218f8b';
  let created = 0;

  for (let i = 0; i < 1000 && created < 500; i++) {
    const first = randomItem(firstNames);
    const last = randomItem(lastNames);
    const email = randomEmail(first, last);

    if (existing.has(email)) continue;

    const password = crypto.randomBytes(4).toString('hex');
    const hashedPwd = await argon2.hash(password);
    const id = crypto.randomUUID();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO directus_users (id, email, password, first_name, last_name, status, role)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        [id, email, hashedPwd, first, last, roleId],
        (err) => {
          if (err && err.message.includes('UNIQUE')) {
            resolve();
          } else if (err) {
            reject(err);
          } else {
            created++;
            console.log(`[${created}/500] ${email} / ${password}`);
            resolve();
          }
        }
      );
    });
  }

  console.log(`\nDone! ${created} users created.`);
  db.close();
}

main().catch(console.error);
